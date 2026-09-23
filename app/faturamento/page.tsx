"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, Settings, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import { brl, dataBR, mesLabel, numeroBR } from "@/lib/format";
import type { ConfigSistema, Fatura, StatusFatura } from "@/lib/types";

export default function FaturamentoPage() {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falha, setFalha] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [mes, setMes] = useState("");

  const [config, setConfig] = useState<ConfigSistema | null>(null);
  const [salvandoCfg, setSalvandoCfg] = useState(false);
  const [msgCfg, setMsgCfg] = useState<string | null>(null);
  const [erroCfg, setErroCfg] = useState<string | null>(null);

  const [gerando, setGerando] = useState(false);
  const [msgGerar, setMsgGerar] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setFalha(null);
      setFaturas(await api<Fatura[]>("/api/faturas"));
    } catch (e) {
      setFalha(e instanceof Error ? e.message : "Erro ao carregar faturas");
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarConfig = useCallback(async () => {
    try {
      const cfg = await api<ConfigSistema>("/api/config");
      setConfig({
        nome_empresa: cfg.nome_empresa,
        tarifa_agua_m3: cfg.tarifa_agua_m3,
        tarifa_esgoto_m3: cfg.tarifa_esgoto_m3,
        taxa_fixa: cfg.taxa_fixa,
        vencimento_dia: cfg.vencimento_dia,
      });
    } catch (e) {
      setErroCfg(e instanceof Error ? e.message : "Erro ao carregar configurações");
    }
  }, []);

  useEffect(() => {
    carregar();
    carregarConfig();
  }, [carregar, carregarConfig]);

  const filtradas = useMemo(() => {
    return faturas.filter((f) => {
      const okStatus = !status || f.status === status;
      const okMes = !mes || f.mes_referencia === mes;
      return okStatus && okMes;
    });
  }, [faturas, status, mes]);

  async function gerarFaturas() {
    setGerando(true);
    setMsgGerar(null);
    try {
      const r = await api<{ geradas: number }>("/api/faturas", { method: "POST", json: { gerar: true } });
      setMsgGerar(
        r.geradas > 0 ? `${r.geradas} fatura(s) gerada(s) a partir das leituras pendentes.` : "Não há leituras pendentes de faturamento.",
      );
      await carregar();
    } catch (e) {
      setMsgGerar(null);
      window.alert(e instanceof Error ? e.message : "Erro ao gerar faturas");
    } finally {
      setGerando(false);
    }
  }

  async function salvarConfig() {
    if (!config) return;
    setSalvandoCfg(true);
    setErroCfg(null);
    setMsgCfg(null);
    try {
      await api<ConfigSistema>("/api/config", { method: "PUT", json: config });
      setMsgCfg("Configurações salvas. Novas faturas usarão os novos valores.");
      await carregarConfig();
    } catch (e) {
      setErroCfg(e instanceof Error ? e.message : "Erro ao salvar configurações");
    } finally {
      setSalvandoCfg(false);
    }
  }

  async function cancelar(f: Fatura) {
    if (!window.confirm(`Cancelar a fatura ${f.numero} de ${f.cliente_nome}?`)) return;
    try {
      await api(`/api/faturas/${f.id}`, { method: "PATCH", json: { status: "Cancelada" } });
      await carregar();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao cancelar fatura");
    }
  }

  async function excluir(f: Fatura) {
    if (!window.confirm(`Excluir definitivamente a fatura ${f.numero}?`)) return;
    try {
      await api(`/api/faturas/${f.id}`, { method: "DELETE" });
      await carregar();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir fatura");
    }
  }

  const setCfg = (k: keyof ConfigSistema) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setConfig((c) => (c ? { ...c, [k]: k === "nome_empresa" ? e.target.value : Number(e.target.value) } : c));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Faturamento</h1>
          <p>Geração de faturas e tarifas aplicadas</p>
        </div>
        <button className="btn btn-primary" onClick={gerarFaturas} disabled={gerando}>
          <RefreshCw size={16} />
          {gerando ? "Gerando..." : "Gerar faturas das leituras pendentes"}
        </button>
      </div>

      {msgGerar && <div className="alert alert-ok">{msgGerar}</div>}

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h2>
              <FileText size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              Faturas geradas
            </h2>
          </div>
          <div className="toolbar" style={{ marginBottom: 14 }}>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 150 }}>
              <option value="">Todas as situações</option>
              {(["Pendente", "Paga", "Vencida", "Cancelada"] as StatusFatura[]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input type="month" className="input" value={mes} onChange={(e) => setMes(e.target.value)} style={{ width: 150 }} />
          </div>

          {carregando ? (
            <div className="loading">Carregando faturas...</div>
          ) : falha ? (
            <div className="alert alert-err">{falha}</div>
          ) : (
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
                    <th className="txt-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty">
                        Nenhuma fatura encontrada
                      </td>
                    </tr>
                  ) : (
                    filtradas.map((f) => (
                      <tr key={f.id}>
                        <td>{f.numero}</td>
                        <td>
                          {f.cliente_nome}
                          <div className="muted" style={{ fontSize: 11.5 }}>
                            {f.cliente_matricula}
                          </div>
                        </td>
                        <td>{mesLabel(f.mes_referencia)}</td>
                        <td className="num">{numeroBR(f.consumo_m3, 1)} m³</td>
                        <td
                          className="num"
                          title={`Água: ${brl(f.tarifa_agua)} · Esgoto: ${brl(f.tarifa_esgoto)} · Taxa fixa: ${brl(f.taxa_fixa)}`}
                        >
                          <b>{brl(f.valor_total)}</b>
                        </td>
                        <td>{dataBR(f.data_vencimento)}</td>
                        <td>
                          <Badge valor={f.status} />
                        </td>
                        <td>
                          <div className="actions-cell">
                            {f.status !== "Cancelada" && f.status !== "Paga" && (
                              <button className="btn btn-ghost btn-sm" onClick={() => cancelar(f)} title="Cancelar fatura">
                                <XCircle size={13} /> Cancelar
                              </button>
                            )}
                            {f.status !== "Paga" && (
                              <button className="btn btn-danger btn-sm" onClick={() => excluir(f)} title="Excluir fatura">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>
              <Settings size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              Tarifas e configurações
            </h2>
          </div>
          {!config ? (
            <div className="loading">Carregando...</div>
          ) : (
            <>
              <div className="form-grid">
                <div className="field" style={{ gridColumn: "span 2" }}>
                  <label>Nome da empresa</label>
                  <input className="input" value={config.nome_empresa} onChange={setCfg("nome_empresa")} />
                </div>
                <div className="field">
                  <label>Tarifa da água (R$/m³)</label>
                  <input className="input" type="number" min="0" step="0.01" value={config.tarifa_agua_m3} onChange={setCfg("tarifa_agua_m3")} />
                </div>
                <div className="field">
                  <label>Tarifa do esgoto (R$/m³)</label>
                  <input className="input" type="number" min="0" step="0.01" value={config.tarifa_esgoto_m3} onChange={setCfg("tarifa_esgoto_m3")} />
                </div>
                <div className="field">
                  <label>Taxa fixa (R$)</label>
                  <input className="input" type="number" min="0" step="0.01" value={config.taxa_fixa} onChange={setCfg("taxa_fixa")} />
                </div>
                <div className="field">
                  <label>Dia de vencimento</label>
                  <input className="input" type="number" min="1" max="31" value={config.vencimento_dia} onChange={setCfg("vencimento_dia")} />
                </div>
              </div>

              {erroCfg && <div className="alert alert-err" style={{ marginTop: 14 }}>{erroCfg}</div>}
              {msgCfg && <div className="alert alert-ok" style={{ marginTop: 14 }}>{msgCfg}</div>}

              <div className="modal-actions">
                <button className="btn btn-primary" onClick={salvarConfig} disabled={salvandoCfg}>
                  {salvandoCfg ? "Salvando..." : "Salvar configurações"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}