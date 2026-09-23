import type Database from "better-sqlite3";
import { CONFIG_PADRAO, getConfig } from "./config";
import { hoje, mesAtual, pad2, ultimosMeses } from "./format";
import { vencimentoPara } from "./faturamento";
import type { ConfigSistema } from "./types";

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inteiro(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function sortear<T>(rng: () => number, lista: T[]): T {
  return lista[Math.floor(rng() * lista.length)];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function dataEntre(rng: () => number, inicio: string, fim: string): string {
  const t1 = Date.parse(`${inicio}T00:00:00`);
  let t2 = Date.parse(`${fim}T00:00:00`);
  if (Number.isNaN(t1)) return inicio;
  if (Number.isNaN(t2) || t2 < t1) t2 = t1;
  const t = t1 + Math.floor(rng() * (t2 - t1 + 86400000));
  const d = new Date(t);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const CLIENTES_SEED = [
  { nome: "Maria da Silva Costa", tipo: "Residencial", bairro: "Centro", endereco: "Rua das Acácias, 120" },
  { nome: "João Pereira Lima", tipo: "Residencial", bairro: "Vila Nova", endereco: "Av. Brasil, 455" },
  { nome: "Ana Beatriz Souza", tipo: "Residencial", bairro: "Jardim Alvorada", endereco: "Rua Piracicaba, 78" },
  { nome: "Supermercado Bom Preço Ltda", tipo: "Comercial", bairro: "Centro", endereco: "Av. Comercial, 1020" },
  { nome: "Padaria Pão Dourado", tipo: "Comercial", bairro: "Vila Nova", endereco: "Rua do Comércio, 52" },
  { nome: "Escola Municipal Tiradentes", tipo: "Público", bairro: "Centro", endereco: "Rua da Educação, 300" },
  { nome: "Clínica Vida Plena", tipo: "Comercial", bairro: "Jardim Alvorada", endereco: "Av. Saudade, 780" },
  { nome: "Carlos Ferreira Rocha", tipo: "Residencial", bairro: "Santa Rita", endereco: "Rua Serra Azul, 15" },
  { nome: "Indústria Metalúrgica Norte", tipo: "Industrial", bairro: "Distrito Industrial", endereco: "Rod. Km 12, s/n" },
  { nome: "Farmácia Popular", tipo: "Comercial", bairro: "Centro", endereco: "Rua Marechal, 210" },
  { nome: "Condomínio Jardim das Águas", tipo: "Residencial", bairro: "Jardim Alvorada", endereco: "Rua Manancial, 1 a 50" },
  { nome: "Restaurante Sabor Caseiro", tipo: "Comercial", bairro: "Santa Rita", endereco: "Rua do Sabor, 90" },
  { nome: "Posto de Saúde Bem Estar", tipo: "Público", bairro: "Santa Rita", endereco: "Rua da Saúde, 44" },
  { nome: "Salão Beleza Pura", tipo: "Comercial", bairro: "Vila Nova", endereco: "Av. Central, 340", status: "Inativo" },
];

const FAIXA_CONSUMO: Record<string, [number, number]> = {
  Residencial: [6, 20],
  Comercial: [15, 95],
  Industrial: [80, 420],
  Público: [45, 170],
  Agrícola: [30, 200],
};

const FORMAS_PAGAMENTO = ["Pix", "Boleto", "Cartão", "Dinheiro", "Pix", "Boleto"];
const LEITORES = ["Cleber A.", "Renata M.", "Josué P.", "Fabiana L."];

function seed(db: Database.Database) {
  const rng = mulberry32(20260923);
  const cfg: ConfigSistema = getConfig(db);
  const hj = hoje();
  const hjDia = Number(hj.slice(8, 10));
  const hjMes = mesAtual();
  const meses = ultimosMeses(6);

  const insertCliente = db.prepare(`
    INSERT INTO clientes (matricula, nome, documento, tipo, telefone, email, endereco, bairro, cidade, cep, hidrometro, status)
    VALUES (@matricula, @nome, @documento, @tipo, @telefone, @email, @endereco, @bairro, @cidade, @cep, @hidrometro, @status)
  `);

  const insertLeitura = db.prepare(`
    INSERT INTO leituras (cliente_id, data_leitura, leitura_anterior, leitura_atual, consumo_m3, leitor, observacao)
    VALUES (@cliente_id, @data_leitura, @leitura_anterior, @leitura_atual, @consumo_m3, @leitor, @observacao)
  `);

  const insertFatura = db.prepare(`
    INSERT INTO faturas (numero, cliente_id, leitura_id, mes_referencia, consumo_m3, taxa_fixa, tarifa_agua,
                         tarifa_esgoto, valor_total, data_emissao, data_vencimento, status)
    VALUES (@numero, @cliente_id, @leitura_id, @mes_referencia, @consumo_m3, @taxa_fixa, @tarifa_agua,
            @tarifa_esgoto, @valor_total, @data_emissao, @data_vencimento, @status)
  `);

  const insertPagamento = db.prepare(`
    INSERT INTO pagamentos (fatura_id, cliente_id, valor, data_pagamento, forma_pagamento, observacao)
    VALUES (@fatura_id, @cliente_id, @valor, @data_pagamento, @forma_pagamento, @observacao)
  `);

  const tx = db.transaction(() => {
    let seqFatura = (db.prepare("SELECT COALESCE(MAX(id), 0) n FROM faturas").get() as { n: number }).n;

    CLIENTES_SEED.forEach((c, i) => {
      const doc = c.tipo === "Residencial" || c.tipo === null ? cpf(rng) : cnpj(rng);
      const cliente = insertCliente.run({
        matricula: `M-${String(i + 1).padStart(4, "0")}`,
        nome: c.nome,
        documento: doc,
        tipo: c.tipo,
        telefone: `(14) 9${inteiro(rng, 1000, 9999)}-${inteiro(rng, 1000, 9999)}`,
        email: slug(c.nome) + "@exemplo.com",
        endereco: c.endereco,
        bairro: c.bairro,
        cidade: "Nova Esperança",
        cep: `${inteiro(rng, 10000, 19999)}-${inteiro(rng, 100, 999)}`,
        hidrometro: `HID${inteiro(rng, 100000, 999999)}`,
        status: (c as { status?: string }).status ?? "Ativo",
      });
      const clienteId = Number(cliente.lastInsertRowid);

      const [min, max] = FAIXA_CONSUMO[c.tipo] ?? FAIXA_CONSUMO.Residencial;
      let leituraAtual = round1(50 + rng() * 450);

      for (const ym of meses) {
        const consumo = round1(min + rng() * (max - min));
        leituraAtual = round1(leituraAtual + consumo);
        const anterior = round1(leituraAtual - consumo);

        let dia: number;
        if (ym === hjMes) dia = Math.max(1, inteiro(rng, 1, hjDia));
        else dia = inteiro(rng, 3, 9);
        const dataLeitura = `${ym}-${pad2(dia)}`;

        const leitura = insertLeitura.run({
          cliente_id: clienteId,
          data_leitura: dataLeitura,
          leitura_anterior: anterior,
          leitura_atual: leituraAtual,
          consumo_m3: consumo,
          leitor: sortear(rng, LEITORES),
          observacao: rng() < 0.12 ? "Hidrômetro com lente suja" : null,
        });

        seqFatura += 1;
        const venc = vencimentoPara(dataLeitura, cfg.vencimento_dia);
        const pago = venc < hj ? rng() < 0.8 : rng() < 0.6;
        const status = pago ? "Paga" : venc < hj ? "Vencida" : "Pendente";

        const tarifa_agua = round2(consumo * cfg.tarifa_agua_m3);
        const tarifa_esgoto = round2(consumo * cfg.tarifa_esgoto_m3);
        const taxa_fixa = round2(cfg.taxa_fixa);
        const valor_total = round2(taxa_fixa + tarifa_agua + tarifa_esgoto);

        const fatura = insertFatura.run({
          numero: `${ym.slice(0, 4)}-${String(seqFatura).padStart(4, "0")}`,
          cliente_id: clienteId,
          leitura_id: Number(leitura.lastInsertRowid),
          mes_referencia: ym,
          consumo_m3: consumo,
          taxa_fixa,
          tarifa_agua,
          tarifa_esgoto,
          valor_total,
          data_emissao: dataLeitura,
          data_vencimento: venc,
          status,
        });

        if (status === "Paga") {
          const fim = venc < hj ? venc : hj;
          insertPagamento.run({
            fatura_id: Number(fatura.lastInsertRowid),
            cliente_id: clienteId,
            valor: valor_total,
            data_pagamento: dataEntre(rng, dataLeitura, fim),
            forma_pagamento: sortear(rng, FORMAS_PAGAMENTO),
            observacao: null,
          });
        }
      }
    });

    const temCfg = (db.prepare("SELECT COUNT(*) n FROM configuracoes").get() as { n: number }).n;
    if (temCfg === 0) {
      const upsert = db.prepare(
        "INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor",
      );
      for (const [chave, valor] of Object.entries(CONFIG_PADRAO)) {
        upsert.run(chave, String(valor));
      }
    }
  });

  tx();
}

export function seedIfEmpty(db: Database.Database): boolean {
  const { n } = db.prepare("SELECT COUNT(*) n FROM clientes").get() as { n: number };
  if (n > 0) return false;
  seed(db);
  return true;
}

export function resetAndSeed(db: Database.Database): void {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM pagamentos").run();
    db.prepare("DELETE FROM faturas").run();
    db.prepare("DELETE FROM leituras").run();
    db.prepare("DELETE FROM clientes").run();
    db.prepare("DELETE FROM configuracoes").run();
  });
  tx();
  seed(db);
}

function slug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

function cpf(rng: () => number): string {
  const p = (n: number) => String(inteiro(rng, 0, 9)).padStart(n, "0");
  return `${p(3)}.${p(3)}.${p(3)}-${p(2)}`;
}

function cnpj(rng: () => number): string {
  const p = (n: number) => String(inteiro(rng, 0, 9)).padStart(n, "0");
  return `${p(2)}.${p(3)}.${p(3)}/0001-${p(2)}`;
}