import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { erro, excecao } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const db = getDb();
    const id = Number((await params).id);

    const leitura = db.prepare("SELECT * FROM leituras WHERE id = ?").get(id);
    if (!leitura) return erro("Leitura não encontrada", 404);

    const fatura = db.prepare("SELECT numero FROM faturas WHERE leitura_id = ?").get(id) as
      | { numero: string }
      | undefined;
    if (fatura) return erro(`A leitura já foi faturada na fatura ${fatura.numero}`, 409);

    db.prepare("DELETE FROM leituras WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return excecao(e);
  }
}