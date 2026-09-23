import type Database from "better-sqlite3";
import { getConfig } from "./config";
import { hoje, pad2 } from "./format";
import type { ConfigSistema } from "./types";

export function calcularValoresFatura(cfg: ConfigSistema, consumoM3: number) {
  const tarifa_agua = round2(consumoM3 * cfg.tarifa_agua_m3);
  const tarifa_esgoto = round2(consumoM3 * cfg.tarifa_esgoto_m3);
  const taxa_fixa = round2(cfg.taxa_fixa);
  const valor_total = round2(taxa_fixa + tarifa_agua + tarifa_esgoto);
  return { taxa_fixa, tarifa_agua, tarifa_esgoto, valor_total };
}

export function vencimentoPara(dataISO: string, dia: number): string {
  const [a, m] = dataISO.slice(0, 10).split("-").map(Number);
  let ano = a;
  let mes = m + 1;
  if (mes > 12) {
    mes = 1;
    ano += 1;
  }
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const d = Math.min(Math.max(1, dia), ultimoDia);
  return `${ano}-${pad2(mes)}-${pad2(d)}`;
}

export function atualizarVencidas(db: Database.Database): number {
  const info = db
    .prepare("UPDATE faturas SET status = 'Vencida' WHERE status = 'Pendente' AND data_vencimento < ?")
    .run(hoje());
  return info.changes;
}

export function gerarFaturas(db: Database.Database): number {
  const cfg = getConfig(db);
  const hj = hoje();

  const pendentes = db
    .prepare(
      `SELECT l.id, l.cliente_id, l.data_leitura, l.consumo_m3
       FROM leituras l
       WHERE NOT EXISTS (SELECT 1 FROM faturas f WHERE f.leitura_id = l.id)
       ORDER BY l.data_leitura ASC, l.id ASC`,
    )
    .all() as { id: number; cliente_id: number; data_leitura: string; consumo_m3: number }[];

  if (pendentes.length === 0) return 0;

  const insert = db.prepare(`
    INSERT INTO faturas
      (numero, cliente_id, leitura_id, mes_referencia, consumo_m3, taxa_fixa, tarifa_agua,
       tarifa_esgoto, valor_total, data_emissao, data_vencimento, status)
    VALUES (@numero, @cliente_id, @leitura_id, @mes_referencia, @consumo_m3, @taxa_fixa, @tarifa_agua,
            @tarifa_esgoto, @valor_total, @data_emissao, @data_vencimento, @status)
  `);

  const tx = db.transaction(() => {
    const base = (db.prepare("SELECT COALESCE(MAX(id), 0) n FROM faturas").get() as { n: number }).n;
    let seq = base;
    let geradas = 0;

    for (const l of pendentes) {
      seq += 1;
      const venc = vencimentoPara(l.data_leitura, cfg.vencimento_dia);
      const valores = calcularValoresFatura(cfg, l.consumo_m3);

      insert.run({
        numero: `${l.data_leitura.slice(0, 4)}-${String(seq).padStart(4, "0")}`,
        cliente_id: l.cliente_id,
        leitura_id: l.id,
        mes_referencia: l.data_leitura.slice(0, 7),
        consumo_m3: l.consumo_m3,
        ...valores,
        data_emissao: l.data_leitura,
        data_vencimento: venc,
        status: venc < hj ? "Vencida" : "Pendente",
      });
      geradas += 1;
    }

    return geradas;
  });

  return tx();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}