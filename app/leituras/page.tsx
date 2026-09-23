"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { dataBR, hoje, numeroBR } from "@/lib/format";
import type { Cliente, Leitura } from "@/lib/types";

export default function LeiturasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falha, setFalha] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [clienteId, setClienteId] = useState("");
  const [dataLeitura, setDataLeitura] = useState(hoje());
  const [leituraAtual, setLeituraAtual] = useState("");
  const [anterior, setAnterior] = useState<number | null>(null);
  const [leitor, setLeitor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [msgForm, setMsgForm] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setFalha(null);
      const [c, l] = await Promise.all([
        api<Cliente[]>("/api/clientes?status=Ativo"),
        api<Leitura[]>("/api/leituras"),
      ]);
      setClientes(c);
      setLeituras(l);
    } catch (e) {
      setFalha(e instanceof Error ? e.message : "Erro ao carregar leituras");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtradas = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return leituras;
    return leituras.filter(
      (l) => l.cliente_nome?.toLowerCase().includes(qq) || l.cliente_matricula?.toLowerCase().includes(qq),
    );
  }, [leituras, q]);

  async function aoTrocarCliente(id: string) {
    setClienteId(id);
    setAnterior(null);
    setLeituraAtual("");
    if (!id) return;
    try {
      const ultimas = await api<Leitura[]>(`/api/leituras?cliente_id=${id}&ultima=1`);
      setAnterior(ultimas.length > 0 ? ultimas[0].leitura_atual : 0);
    } catch {
      setAnterior(0);
    }
  }

  const consumo = (() => {
    const atual = Number(leituraAtual);
    const ant = anterior ?? 0;
    if (!Number.isFinite(atual) || atual < ant) return null;
    return Math.round((atual - ant) * 10) / 10;
  })();

  async function salvarLeitura() {
    setSalvando(true);
    setErroForm(null);
    setMsgForm(null);
    try {
      await api("/api/leituras", {
        method: "POST",
        json: {
          cliente_id: Number(clienteId),
          data_leitura: dataLeitura,
          leitura_atual: Number(leituraAtual),
          leitor,
          observacao,
        },
      });
      setMsgForm(`Leitura registrada com sucesso (${numeroBR(consumo ?? 0, 1)} m³).`);
      setLeituraAtual("");
      setLeitor("");
      setObservacao("");
      setAnterior(null);
      await carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao registrar leitura");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(l: Leitura) {
    if (!window.confirm(`Excluir a leitura de ${l.cliente_nome} (${dataBR(l.data_leitura)})?`)) return;
    try {
      await api(`/api/leituras/${l.id}`, { method: "DELETE" });
      await carregar();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir leitura");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Leituras</h1>
          <p>Registro das leituras de hidrômetro</p>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>
            <Gauge size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
            Registrar leitura
          </h2>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Cliente *</label>
            <select className="input" value={clienteId} onChange={(e) => aoTrocarCliente(e.target.value)}>
              <option value="">Selecione o cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.matricula})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Data da leitura</label>
            <input type="date" className="input" value={dataLeitura} onChange={(e) => setDataLeitura(e.target.value)} />
          </div>
          <div className="field">
            <label>Leitura atual (m³) *</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.1"
              value={leituraAtual}
              onChange={(e) => setLeituraAtual(e.target.value)}
              placeholder="0,0"
            />
          </div>
          <div className="field">
            <label>Leitor</label>
            <input className="input" value={leitor} onChange={(e) => setLeitor(e.target.value)} placeholder="Nome do leitor" />
          </div>
          <div className="field" style={{ gridColumn: "span 2" }}>
            <label>Observação</label>
            <input className="input" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div className="resumo-preview" style={{ marginTop: 16 }}>
          <span>
            Leitura anterior: <b>{anterior === null ? "—" : `${numeroBR(anterior, 1)} m³`}</b>
          </span>
          <span>
            Consumo calculado:{" "}
            <b>
              {consumo === null
                ? "aguardando leitura válida"
                : `${numeroBR(consumo, 1)} m³`}
            </b>
          </span>
        </div>

        {erroForm && <div className="alert alert-err" style={{ marginTop: 14 }}>{erroForm}</div>}
        {msgForm && <div className="alert alert-ok" style={{ marginTop: 14 }}>{msgForm}</div>}

        <div className="modal-actions">
          <button
            className="btn btn-primary"
            onClick={salvarLeitura}
            disabled={salvando || !clienteId || consumo === null}
          >
            <Plus size={16} />
            {salvando ? "Salvando..." : "Registrar leitura"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Histórico de leituras</h2>
          <span className="input" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 260 }}>
            <Search size={15} style={{ color: "#64748b" }} />
            <input
              style={{ border: 0, outline: "none", flex: 1, fontFamily: "inherit", fontSize: 13.5 }}
              placeholder="Filtrar por cliente..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </span>
        </div>

        {carregando ? (
          <div className="loading">Carregando leituras...</div>
        ) : falha ? (
          <div className="alert alert-err">{falha}</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th className="num">Anterior</th>
                  <th className="num">Atual</th>
                  <th className="num">Consumo</th>
                  <th>Leitor</th>
                  <th>Situação</th>
                  <th className="txt-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty">
                      Nenhuma leitura encontrada
                    </td>
                  </tr>
                ) : (
                  filtradas.map((l) => (
                    <tr key={l.id}>
                      <td>{dataBR(l.data_leitura)}</td>
                      <td>
                        {l.cliente_nome}
                        <div className="muted" style={{ fontSize: 11.5 }}>
                          {l.cliente_matricula}
                        </div>
                      </td>
                      <td className="num">{numeroBR(l.leitura_anterior, 1)}</td>
                      <td className="num">{numeroBR(l.leitura_atual, 1)}</td>
                      <td className="num">
                        <b>{numeroBR(l.consumo_m3, 1)} m³</b>
                      </td>
                      <td>{l.leitor ?? "—"}</td>
                      <td>
                        {l.faturada ? (
                          <span className="badge badge-faturada">Faturada</span>
                        ) : (
                          <span className="badge badge-pendente">Pendente</span>
                        )}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => excluir(l)}
                            disabled={Boolean(l.faturada)}
                            title={l.faturada ? "Leitura já faturada" : "Excluir leitura"}
                          >
                            <Trash2 size={13} />
                          </button>
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
    </>
  );
}