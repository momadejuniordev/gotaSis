import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/config";
import { getDb } from "@/lib/db";
import { erro, excecao } from "@/lib/http";
import type { ConfigSistema } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(getConfig(getDb()));
  } catch (e) {
    return excecao(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const b = await req.json().catch(() => null);
    if (!b) return erro("Corpo da requisição inválido");

    const parcial: Partial<ConfigSistema> = {};

    if (b.nome_empresa !== undefined) {
      const nome = String(b.nome_empresa).trim();
      if (!nome) return erro("O nome da empresa é obrigatório");
      parcial.nome_empresa = nome;
    }

    for (const campo of ["tarifa_agua_m3", "tarifa_esgoto_m3", "taxa_fixa"] as const) {
      if (b[campo] !== undefined) {
        const v = Number(b[campo]);
        if (!Number.isFinite(v) || v < 0) return erro(`Valor inválido para ${campo}`);
        parcial[campo] = v;
      }
    }

    if (b.vencimento_dia !== undefined) {
      const d = Number(b.vencimento_dia);
      if (!Number.isInteger(d) || d < 1 || d > 31) return erro("O dia de vencimento deve estar entre 1 e 31");
      parcial.vencimento_dia = d;
    }

    return NextResponse.json(saveConfig(db, parcial));
  } catch (e) {
    return excecao(e);
  }
}