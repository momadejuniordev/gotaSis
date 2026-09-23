import { NextResponse } from "next/server";

export function erro(mensagem: string, status = 400) {
  return NextResponse.json({ error: mensagem }, { status });
}

export function excecao(e: unknown) {
  console.error(e);
  const mensagem = e instanceof Error ? e.message : "Erro interno do servidor";
  return NextResponse.json({ error: mensagem }, { status: 500 });
}