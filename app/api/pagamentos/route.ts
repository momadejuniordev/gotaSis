import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hoje } from "@/lib/format";
import { erro, excecao } from "@/lib/http";
import type { Fatura, Pagamento } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const p = req.nextUrl.searchParams;
    const limite = Number(p.get("limit") ?? 50);
    const clienteId = p.get("cliente_id");

    let sql = `
      SELECT pg.*, c.nome cliente_nome, f.numero fatura_numero
      FROM pagamentos pg
      JOIN clientes c ON c.id = pg.cliente_id
      JOIN faturas f ON f.id = pg.fatura_id
      WHERE 1=1`;
    const params: (string | number)[] = [];

    if (clienteId) {
      sql += " AND pg.cliente_id = ?";
      params.push(Number(clienteId));
    }
    sql += " ORDER BY pg.data_pagamento DESC, pg.id DESC LIMIT ?";
    params.push(Number.isFinite(limite) && limite > 0 ? limite : 50);

    const pagamentos = db.prepare(sql).all(...params) as Pagamento[];
    return NextResponse.json(pagamentos);
  } catch (e) {
    return excecao(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const b = await req.json().catch(() => null);
    if (!b) return erro("Corpo da requisição inválido");

    const faturaId = Number(b.fatura_id);
    if (!faturaId) return erro("Selecione a fatura");

    const fatura = db.prepare("SELECT * FROM faturas WHERE id = ?").get(faturaId) as Fatura | undefined;
    if (!fatura) return erro("Fatura não encontrada", 404);
    if (fatura.status === "Cancelada") return erro("Faturas canceladas não aceitam pagamento", 409);

    const pago = (
      db.prepare("SELECT COALESCE(SUM(valor), 0) v FROM pagamentos WHERE fatura_id = ?").get(faturaId) as {
        v: number;
      }
    ).v;
    const saldo = Math.round((fatura.valor_total - pago) * 100) / 100;
    if (saldo <= 0) return erro("Esta fatura já está totalmente paga", 409);

    const valor = b.valor === undefined || b.valor === null || b.valor === "" ? saldo : Number(b.valor);
    if (!Number.isFinite(valor) || valor <= 0) return erro("Informe um valor de pagamento válido");
    if (valor > saldo + 0.001) return erro(`O valor não pode exceder o saldo da fatura (${saldo.toFixed(2)})`);

    const dataPagamento = String(b.data_pagamento ?? "").trim() || hoje();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento)) return erro("Informe uma data de pagamento válida");

    const formas = ["Pix", "Dinheiro", "Cartão", "Boleto", "Cheque", "Transferência"];
    const forma = formas.includes(b.forma_pagamento) ? b.forma_pagamento : "Pix";

    const info = db
      .prepare(
        `INSERT INTO pagamentos (fatura_id, cliente_id, valor, data_pagamento, forma_pagamento, observacao)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        faturaId,
        fatura.cliente_id,
        Math.round(valor * 100) / 100,
        dataPagamento,
        forma,
        b.observacao ? String(b.observacao).trim() : null,
      );

    const novoPago = (
      db.prepare("SELECT COALESCE(SUM(valor), 0) v FROM pagamentos WHERE fatura_id = ?").get(faturaId) as {
        v: number;
      }
    ).v;

    const status = novoPago + 0.001 >= fatura.valor_total ? "Paga" : fatura.data_vencimento < hoje() ? "Vencida" : "Pendente";
    db.prepare("UPDATE faturas SET status = ? WHERE id = ?").run(status, faturaId);

    const pagamento = db.prepare("SELECT * FROM pagamentos WHERE id = ?").get(Number(info.lastInsertRowid));

    return NextResponse.json({ pagamento, fatura: { ...fatura, status } }, { status: 201 });
  } catch (e) {
    return excecao(e);
  }
}