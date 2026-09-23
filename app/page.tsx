"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Receipt, Users, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/Badge";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { dataCurta, mesLabel, moeda, numero } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

const CORES_STATUS: Record<string, string> = {
  Paga: "#10b981",
  Pendente: "#f59e0b",
  Vencida: "#ef4444",
  Cancelada: "#94a3b8",
};

const tooltipMoeda = {
  formatter: (v: unknown) => moeda(Number(v)),
};

export default function DashboardPage() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setDados(await api<DashboardData>("/api/dashboard"));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar o dashboard");
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!dados) {
    return <div className="loading">{erro ? `Erro: ${erro}` : "Carregando dados..."}</div>;
  }

  const { resumo, serieMeses, statusFaturas, inadimplentes, ultimasFaturas } = dados;

  const serieMoeda = serieMeses.map((m) => ({
    mes: mesLabel(m.mes),
    Faturado: m.faturado,
    Arrecadado: m.arrecadado,
  }));

  const serieConsumo = serieMeses.map((m) => ({ mes: mesLabel(m.mes), consumo: m.consumo }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral da operação </p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Clientes ativos"
          valor={String(resumo.clientesAtivos)}
          detalhe={`${resumo.clientes} cadastrados no total`}
          icone={Users}
          cor="#0284c7"
        />
        <StatCard
          label="Faturado no mês"
          valor={moeda(resumo.faturadoMes)}
          detalhe={`${numero(resumo.consumoMes, 1)} m³ consumidos`}
          icone={Receipt}
          cor="#0ea5e9"
        />
        <StatCard
          label="Arrecadado no mês"
          valor={moeda(resumo.arrecadadoMes)}
          detalhe={`${resumo.faturasAbertas} faturas em aberto`}
          icone={Wallet}
          cor="#10b981"
        />
        <StatCard
          label="Inadimplência"
          valor={moeda(resumo.inadimplencia)}
          detalhe="Faturas vencidas sem pagamento"
          icone={AlertTriangle}
          cor="#ef4444"
        />
      </div>

      <div className="charts-grid">
        <div className="card">
          <h2>Faturamento x Arrecadação (6 meses)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={serieMoeda} margin={{ left: -10, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => moeda(v)} width={80} />
              <Tooltip {...tooltipMoeda} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Faturado" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Arrecadado" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Faturas por situação</h2>
          {statusFaturas.length === 0 ? (
            <div className="empty">Nenhuma fatura cadastrada</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={statusFaturas}
                    dataKey="valor"
                    nameKey="status"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {statusFaturas.map((s) => (
                      <Cell key={s.status} fill={CORES_STATUS[s.status] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => moeda(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {statusFaturas.map((s) => (
                  <span key={s.status} style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: CORES_STATUS[s.status] ?? "#94a3b8" }} />
                    <b>{s.status}</b> · {s.quantidade} ({moeda(s.valor)})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <h2>Consumo de água (m³) </h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={serieConsumo} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} width={46} />
              <Tooltip formatter={(v: unknown) => [`${numero(Number(v), 1)} m³`, "Consumo"]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="consumo" name="Consumo" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Maiores inadimplentes</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="num">Em aberto</th>
                  <th className="txt-right">Qtde</th>
                </tr>
              </thead>
              <tbody>
                {inadimplentes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">
                      Nenhuma pendência vencida
                    </td>
                  </tr>
                ) : (
                  inadimplentes.map((i) => (
                    <tr key={i.matricula}>
                      <td>
                        <div>{i.cliente}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>
                          {i.matricula}
                        </div>
                      </td>
                      <td className="num">{moeda(i.valor)}</td>
                      <td className="num">{i.faturas}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Últimas faturas</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Competência</th>
                <th className="num">Consumo</th>
                <th className="num">Valor</th>
                <th>Vencimento</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {ultimasFaturas.map((f) => (
                <tr key={f.id}>
                  <td>{f.numero}</td>
                  <td>
                    {f.cliente_nome}
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {f.cliente_matricula}
                    </div>
                  </td>
                  <td>{mesLabel(f.mes_referencia)}</td>
                  <td className="num">{numero(f.consumo_m3, 1)} m³</td>
                  <td className="num">{moeda(f.valor_total)}</td>
                  <td>{dataCurta(f.data_vencimento)}</td>
                  <td>
                    <Badge valor={f.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}