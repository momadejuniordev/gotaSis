import type { Metadata, Viewport } from "next";
import { getConfig } from "@/lib/config";
import { getDb } from "@/lib/db";
import { mesAtual, mesLabel } from "@/lib/format";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GotaSis — Gestão de Água",
  description: "Sistema de gestão para fornecedores de água",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = getConfig(getDb());

  return (
    <html lang="pt-BR">
      <body>
        <div className="app-shell">
          <Sidebar empresa={cfg.nome_empresa} />
          <div className="main">
            <header className="topbar">
              <div className="topbar-title">{cfg.nome_empresa}</div>
              <div className="topbar-right">
                <span className="chip">Competência: {mesLabel(mesAtual())}</span>
                <span>
                  Operador: <b>Administrador</b>
                </span>
              </div>
            </header>
            <main className="content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}