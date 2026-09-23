import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getDashboard } from "@/lib/dashboard";
import { excecao } from "@/lib/http";

export async function GET() {
  try {
    return NextResponse.json(getDashboard(getDb()));
  } catch (e) {
    return excecao(e);
  }
}