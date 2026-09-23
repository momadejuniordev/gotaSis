import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { atualizarVencidas, gerarFaturas } from "@/lib/faturamento";
import { erro, excecao } from "@/lib/http";
import type { Fatura } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    atualizarVencidas(db);

    const p = req.nextUrl.searchParams;
    const status = p.get("status");
    const mes = p.get("mes");
    const q = p.get("q")?.trim();
    const abertas = p.get("abertas") === "1";

    let sql = `
      SELECT f.*, c.nome cliente_nome, c.matricula cliente_matricula
      FROM faturas f
      JOIN clientes c ON c.id = f.cliente_id
      WHERE 1=1`;
    const params: (string | number)[] = [];

    if (status) {
      sql += " AND f.status = ?";
      params.push(status);
    }
    if (abertas) {
      sql += " AND f.status IN ('Pendente', 'Vencida')";
    }
    if (mes) {
      sql += " AND f.mes_referencia = ?";
      params.push(mes);
    }
    if (q) {
      sql += " AND (c.nome LIKE ? OR c.matricula LIKE ? OR f.numero LIKE ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY f.data_vencimento ASC, f.id ASC";

    const faturas = db.prepare(sql).all(...params) as Fatura[];
    return NextResponse.json(faturas);
  } catch (e) {
    return excecao(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const b = await req.json().catch(() => ({}));

    if (b?.gerar !== true && b?.gerar !== "true") {
      return erro('Envie { "gerar": true } para gerar faturas das leituras pendentes');
    }

    const geradas = gerarFaturas(db);
    return NextResponse.json({ geradas }, { status: 201 });
  } catch (e) {
    return excecao(e);
  }
}