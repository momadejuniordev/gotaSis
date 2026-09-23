import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { erro, excecao } from "@/lib/http";
import type { Fatura, Pagamento } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const db = getDb();
    const id = Number((await params).id);
    const fatura = db
      .prepare(
        `SELECT f.*, c.nome cliente_nome, c.matricula cliente_matricula
         FROM faturas f JOIN clientes c ON c.id = f.cliente_id
         WHERE f.id = ?`,
      )
      .get(id) as Fatura | undefined;
    if (!fatura) return erro("Fatura não encontrada", 404);

    const pagamentos = db
      .prepare("SELECT * FROM pagamentos WHERE fatura_id = ? ORDER BY data_pagamento DESC")
      .all(id) as Pagamento[];

    return NextResponse.json({ ...fatura, pagamentos });
  } catch (e) {
    return excecao(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const db = getDb();
    const id = Number((await params).id);
    const fatura = db.prepare("SELECT * FROM faturas WHERE id = ?").get(id) as Fatura | undefined;
    if (!fatura) return erro("Fatura não encontrada", 404);

    const b = await req.json().catch(() => null);
    const status = String(b?.status ?? "");

    if (status !== "Cancelada") return erro("Ação não suportada");

    if (fatura.status === "Paga") return erro("Faturas pagas não podem ser canceladas", 409);

    db.prepare("UPDATE faturas SET status = 'Cancelada' WHERE id = ?").run(id);
    return NextResponse.json({ ...fatura, status: "Cancelada" });
  } catch (e) {
    return excecao(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const db = getDb();
    const id = Number((await params).id);
    const fatura = db.prepare("SELECT * FROM faturas WHERE id = ?").get(id) as Fatura | undefined;
    if (!fatura) return erro("Fatura não encontrada", 404);

    const pagamentos = db.prepare("SELECT COUNT(*) n FROM pagamentos WHERE fatura_id = ?").get(id) as { n: number };
    if (pagamentos.n > 0) return erro("Fatura possui pagamentos. Cancele-a em vez de excluir.", 409);

    db.prepare("DELETE FROM faturas WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return excecao(e);
  }
}