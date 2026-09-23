import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hoje } from "@/lib/format";
import { erro, excecao } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const db = getDb();
    const id = Number((await params).id);

    const pagamento = db.prepare("SELECT * FROM pagamentos WHERE id = ?").get(id) as
      | { id: number; fatura_id: number }
      | undefined;
    if (!pagamento) return erro("Pagamento não encontrado", 404);

    db.prepare("DELETE FROM pagamentos WHERE id = ?").run(id);

    const fatura = db.prepare("SELECT * FROM faturas WHERE id = ?").get(pagamento.fatura_id) as
      | { valor_total: number; data_vencimento: string }
      | undefined;

    if (fatura) {
      const pago = (
        db.prepare("SELECT COALESCE(SUM(valor), 0) v FROM pagamentos WHERE fatura_id = ?").get(pagamento.fatura_id) as {
          v: number;
        }
      ).v;
      const status =
        pago + 0.001 >= fatura.valor_total
          ? "Paga"
          : fatura.data_vencimento < hoje()
            ? "Vencida"
            : "Pendente";
      db.prepare("UPDATE faturas SET status = ? WHERE id = ?").run(status, pagamento.fatura_id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return excecao(e);
  }
}