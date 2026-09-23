import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { erro, excecao } from "@/lib/http";
import type { Leitura } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const p = req.nextUrl.searchParams;
    const clienteId = p.get("cliente_id");
    const q = p.get("q")?.trim();
    const ultima = p.get("ultima") === "1";

    let sql = `
      SELECT l.*, c.nome cliente_nome, c.matricula cliente_matricula,
             CASE WHEN EXISTS (SELECT 1 FROM faturas f WHERE f.leitura_id = l.id) THEN 1 ELSE 0 END faturada
      FROM leituras l
      JOIN clientes c ON c.id = l.cliente_id
      WHERE 1=1`;
    const params: (string | number)[] = [];

    if (clienteId) {
      sql += " AND l.cliente_id = ?";
      params.push(Number(clienteId));
    }
    if (q) {
      sql += " AND (c.nome LIKE ? OR c.matricula LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY l.data_leitura DESC, l.id DESC";
    if (ultima) sql += " LIMIT 1";

    const leituras = db.prepare(sql).all(...params) as Leitura[];
    return NextResponse.json(leituras);
  } catch (e) {
    return excecao(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const b = await req.json().catch(() => null);
    if (!b) return erro("Corpo da requisição inválido");

    const clienteId = Number(b.cliente_id);
    if (!clienteId) return erro("Selecione o cliente");

    const cliente = db.prepare("SELECT * FROM clientes WHERE id = ?").get(clienteId);
    if (!cliente) return erro("Cliente não encontrado", 404);

    const dataLeitura = String(b.data_leitura ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLeitura)) return erro("Informe uma data de leitura válida (AAAA-MM-DD)");

    const leituraAtual = Number(b.leitura_atual);
    if (!Number.isFinite(leituraAtual) || leituraAtual < 0) return erro("Informe a leitura atual do hidrômetro");

    const ultima = db
      .prepare(
        `SELECT leitura_atual FROM leituras
         WHERE cliente_id = ? ORDER BY data_leitura DESC, id DESC LIMIT 1`,
      )
      .get(clienteId) as { leitura_atual: number } | undefined;

    const anterior = ultima ? Number(ultima.leitura_atual) : 0;
    if (leituraAtual < anterior) {
      return erro(`A leitura atual não pode ser menor que a anterior (${anterior.toLocaleString("pt-BR")})`);
    }

    const consumo = Math.round((leituraAtual - anterior) * 10) / 10;

    const info = db
      .prepare(
        `INSERT INTO leituras (cliente_id, data_leitura, leitura_anterior, leitura_atual, consumo_m3, leitor, observacao)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        clienteId,
        dataLeitura,
        anterior,
        leituraAtual,
        consumo,
        b.leitor ? String(b.leitor).trim() : null,
        b.observacao ? String(b.observacao).trim() : null,
      );

    const leitura = db
      .prepare(
        `SELECT l.*, c.nome cliente_nome, c.matricula cliente_matricula, 0 faturada
         FROM leituras l JOIN clientes c ON c.id = l.cliente_id
         WHERE l.id = ?`,
      )
      .get(Number(info.lastInsertRowid)) as Leitura;

    return NextResponse.json(leitura, { status: 201 });
  } catch (e) {
    return excecao(e);
  }
}