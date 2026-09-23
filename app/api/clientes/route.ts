import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { erro, excecao } from "@/lib/http";
import type { Cliente } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const p = req.nextUrl.searchParams;
    const q = p.get("q")?.trim();
    const status = p.get("status");
    const tipo = p.get("tipo");

    let sql = "SELECT * FROM clientes WHERE 1=1";
    const params: (string | number)[] = [];

    if (q) {
      sql += " AND (nome LIKE ? OR matricula LIKE ? OR documento LIKE ? OR hidrometro LIKE ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    if (tipo) {
      sql += " AND tipo = ?";
      params.push(tipo);
    }
    sql += " ORDER BY nome ASC";

    const clientes = db.prepare(sql).all(...params) as Cliente[];
    return NextResponse.json(clientes);
  } catch (e) {
    return excecao(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const b = await req.json().catch(() => null);
    if (!b) return erro("Corpo da requisição inválido");

    const nome = String(b.nome ?? "").trim();
    if (!nome) return erro("O nome do cliente é obrigatório");

    let matricula = String(b.matricula ?? "").trim();
    if (!matricula) matricula = gerarMatricula(db);

    const existe = db.prepare("SELECT 1 FROM clientes WHERE matricula = ?").get(matricula);
    if (existe) return erro(`A matrícula "${matricula}" já está em uso`, 409);

    const info = db
      .prepare(
        `INSERT INTO clientes (matricula, nome, documento, tipo, telefone, email, endereco, bairro, cidade, cep, hidrometro, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        matricula,
        nome,
        limpo(b.documento),
        b.tipo || "Residencial",
        limpo(b.telefone),
        limpo(b.email),
        limpo(b.endereco),
        limpo(b.bairro),
        limpo(b.cidade),
        limpo(b.cep),
        limpo(b.hidrometro),
        b.status === "Inativo" ? "Inativo" : "Ativo",
      );

    const cliente = db.prepare("SELECT * FROM clientes WHERE id = ?").get(Number(info.lastInsertRowid)) as Cliente;
    return NextResponse.json(cliente, { status: 201 });
  } catch (e) {
    return excecao(e);
  }
}

function gerarMatricula(db: ReturnType<typeof getDb>): string {
  for (let i = 1; i < 100000; i++) {
    const m = `M-${String(i).padStart(4, "0")}`;
    if (!db.prepare("SELECT 1 FROM clientes WHERE matricula = ?").get(m)) return m;
  }
  return `M-${Date.now()}`;
}

function limpo(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}