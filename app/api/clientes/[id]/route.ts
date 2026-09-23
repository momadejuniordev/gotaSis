import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { erro, excecao } from "@/lib/http";
import type { Cliente } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const db = getDb();
    const id = Number((await params).id);
    const cliente = db.prepare("SELECT * FROM clientes WHERE id = ?").get(id) as Cliente | undefined;
    if (!cliente) return erro("Cliente não encontrado", 404);
    return NextResponse.json(cliente);
  } catch (e) {
    return excecao(e);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const db = getDb();
    const id = Number((await params).id);
    const atual = db.prepare("SELECT * FROM clientes WHERE id = ?").get(id) as Cliente | undefined;
    if (!atual) return erro("Cliente não encontrado", 404);

    const b = await req.json().catch(() => null);
    if (!b) return erro("Corpo da requisição inválido");

    const nome = String(b.nome ?? atual.nome).trim();
    if (!nome) return erro("O nome do cliente é obrigatório");

    const matricula = String(b.matricula ?? atual.matricula).trim();
    if (!matricula) return erro("A matrícula é obrigatória");

    const conflito = db
      .prepare("SELECT 1 FROM clientes WHERE matricula = ? AND id <> ?")
      .get(matricula, id);
    if (conflito) return erro(`A matrícula "${matricula}" já está em uso`, 409);

    db.prepare(
      `UPDATE clientes SET
        matricula = ?, nome = ?, documento = ?, tipo = ?, telefone = ?, email = ?,
        endereco = ?, bairro = ?, cidade = ?, cep = ?, hidrometro = ?, status = ?
       WHERE id = ?`,
    ).run(
      matricula,
      nome,
      limpo(b.documento ?? atual.documento),
      b.tipo || atual.tipo,
      limpo(b.telefone ?? atual.telefone),
      limpo(b.email ?? atual.email),
      limpo(b.endereco ?? atual.endereco),
      limpo(b.bairro ?? atual.bairro),
      limpo(b.cidade ?? atual.cidade),
      limpo(b.cep ?? atual.cep),
      limpo(b.hidrometro ?? atual.hidrometro),
      b.status === "Inativo" ? "Inativo" : "Ativo",
      id,
    );

    return NextResponse.json(db.prepare("SELECT * FROM clientes WHERE id = ?").get(id));
  } catch (e) {
    return excecao(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const db = getDb();
    const id = Number((await params).id);
    const atual = db.prepare("SELECT 1 FROM clientes WHERE id = ?").get(id);
    if (!atual) return erro("Cliente não encontrado", 404);

    const pagamentos = db
      .prepare(
        `SELECT COUNT(*) n FROM pagamentos p
         JOIN faturas f ON f.id = p.fatura_id
         WHERE f.cliente_id = ?`,
      )
      .get(id) as { n: number };

    if (pagamentos.n > 0) {
      return erro("Não é possível excluir: o cliente possui pagamentos registrados", 409);
    }

    db.prepare("DELETE FROM clientes WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return excecao(e);
  }
}

function limpo(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}