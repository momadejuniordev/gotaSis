import type Database from "better-sqlite3";
import { getConfig } from "./config";
import { hoje } from "./format";
import { atualizarVencidas } from "./faturamento";
import type { DashboardData, Fatura } from "./types";

type Linha = Record<string, any>;

function mapa(rows: Linha[]): Record<string, Linha> {
  const out: Record<string, Linha> = {};
  for (const r of rows) out[String(r.m ?? r.chave)] = r;
  return out;
}

export function getDashboard(db: Database.Database): DashboardData {
  atualizarVencidas(db);
  const hj = hoje();
  const mesHj = hj.slice(0, 7);
  getConfig(db);

  const c = db
    .prepare(
      `SELECT COUNT(*) total,
              SUM(CASE WHEN status = 'Ativo' THEN 1 ELSE 0 END) ativos
       FROM clientes`,
    )
    .get() as { total: number; ativos: number | null };

  const faturadoMes = (
    db
      .prepare(
        `SELECT COALESCE(SUM(valor_total), 0) v FROM faturas
         WHERE mes_referencia = ? AND status <> 'Cancelada'`,
      )
      .get(mesHj) as { v: number }
  ).v;

  const arrecadadoMes = (
    db
      .prepare(
        `SELECT COALESCE(SUM(valor), 0) v FROM pagamentos
         WHERE substr(data_pagamento, 1, 7) = ?`,
      )
      .get(mesHj) as { v: number }
  ).v;

  const consumoMes = (
    db
      .prepare(
        `SELECT COALESCE(SUM(consumo_m3), 0) v FROM leituras
         WHERE substr(data_leitura, 1, 7) = ?`,
      )
      .get(mesHj) as { v: number }
  ).v;

  const inadimplencia = (
    db
      .prepare(
        `SELECT COALESCE(SUM(f.valor_total - IFNULL(
             (SELECT SUM(p.valor) FROM pagamentos p WHERE p.fatura_id = f.id), 0)), 0) v
         FROM faturas f
         WHERE f.status <> 'Cancelada' AND f.data_vencimento < ?`,
      )
      .get(hj) as { v: number }
  ).v;

  const faturasAbertas = (
    db
      .prepare(`SELECT COUNT(*) n FROM faturas WHERE status IN ('Pendente', 'Vencida')`)
      .get() as { n: number }
  ).n;

  const fatPorMes = mapa(
    db
      .prepare(
        `SELECT mes_referencia m, SUM(valor_total) v FROM faturas
         WHERE status <> 'Cancelada' GROUP BY mes_referencia`,
      )
      .all() as Linha[],
  );
  const pagPorMes = mapa(
    db
      .prepare(
        `SELECT substr(data_pagamento, 1, 7) m, SUM(valor) v FROM pagamentos GROUP BY 1`,
      )
      .all() as Linha[],
  );
  const consumoPorMes = mapa(
    db
      .prepare(
        `SELECT substr(data_leitura, 1, 7) m, SUM(consumo_m3) v FROM leituras GROUP BY 1`,
      )
      .all() as Linha[],
  );

  const dias: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    dias.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const serieMeses = dias.map((mes) => ({
    mes,
    faturado: Number(fatPorMes[mes]?.v ?? 0),
    arrecadado: Number(pagPorMes[mes]?.v ?? 0),
    consumo: Number(consumoPorMes[mes]?.v ?? 0),
  }));

  const statusFaturas = db
    .prepare(
      `SELECT status, COUNT(*) quantidade, COALESCE(SUM(valor_total), 0) valor
       FROM faturas GROUP BY status`,
    )
    .all() as DashboardData["statusFaturas"];

  const inadimplentes = db
    .prepare(
      `SELECT c.nome cliente, c.matricula matricula,
              SUM(f.valor_total - IFNULL((SELECT SUM(p.valor) FROM pagamentos p WHERE p.fatura_id = f.id), 0)) valor,
              COUNT(*) faturas
       FROM faturas f
       JOIN clientes c ON c.id = f.cliente_id
       WHERE f.status <> 'Cancelada' AND f.data_vencimento < ?
       GROUP BY c.id
       ORDER BY valor DESC
       LIMIT 6`,
    )
    .all(hj) as DashboardData["inadimplentes"];

  const ultimasFaturas = db
    .prepare(
      `SELECT f.*, c.nome cliente_nome, c.matricula cliente_matricula
       FROM faturas f
       JOIN clientes c ON c.id = f.cliente_id
       ORDER BY f.id DESC
       LIMIT 6`,
    )
    .all() as Fatura[];

  return {
    resumo: {
      clientes: c.total,
      clientesAtivos: c.ativos ?? 0,
      faturadoMes,
      arrecadadoMes,
      consumoMes,
      inadimplencia,
      faturasAbertas,
    },
    serieMeses,
    statusFaturas,
    inadimplentes,
    ultimasFaturas,
  };
}