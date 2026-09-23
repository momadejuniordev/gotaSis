import type Database from "better-sqlite3";
import type { ConfigSistema } from "./types";

export const CONFIG_PADRAO: ConfigSistema = {
  nome_empresa: "Águas de Nova Esperança",
  tarifa_agua_m3: 4.55,
  tarifa_esgoto_m3: 2.95,
  taxa_fixa: 18.9,
  vencimento_dia: 10,
};

const NUMERICOS = new Set(["tarifa_agua_m3", "tarifa_esgoto_m3", "taxa_fixa", "vencimento_dia"]);

export function getConfig(db: Database.Database): ConfigSistema {
  const linhas = db.prepare("SELECT chave, valor FROM configuracoes").all() as { chave: string; valor: string }[];
  const cfg: Record<string, string | number> = { ...CONFIG_PADRAO };
  for (const l of linhas) {
    cfg[l.chave] = NUMERICOS.has(l.chave) ? Number(l.valor) : l.valor;
  }
  return cfg as unknown as ConfigSistema;
}

export function saveConfig(db: Database.Database, parcial: Partial<ConfigSistema>): ConfigSistema {
  const atual = getConfig(db);
  const proximo: ConfigSistema = { ...atual, ...parcial };
  const upsert = db.prepare(
    "INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor",
  );
  const tx = db.transaction(() => {
    for (const [chave, valor] of Object.entries(proximo)) {
      upsert.run(chave, String(valor));
    }
  });
  tx();
  return proximo;
}