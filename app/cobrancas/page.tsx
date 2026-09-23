"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, CreditCard, RefreshCw, RotateCcw } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { dataCurta, hoje, moeda } from "@/lib/format";
import type { Fatura, Pagamento } from "@/lib/types";

const FORMAS = ["Pix", "Boleto", "Cartão", "Dinheiro", "Cheque", "Transferência"];

export default function CobrancasPage() {
  const [abertas, setAbertas] = useState<Fatura[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falha, setFalha] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  const [pagamentoDe, setPagamentoDe] = useState<Fatura | null>(null);

  const carregar = useCallback(async () => {
    try {
      setFalha(null);
      const [a, p] = await Promise.all([
        api<Fatura[]>("/api/faturas?abertas=1"),
        api<Pagamento[]>("/api/pagamentos?limit=12"),
      ]);
      setAbertas(a);
      setPagamentos(p);
    } catch (e) {
      setFalha(e instanceof Error ? e.message : "Erro ao carregar cobranças");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtradas = abertas.filter((f) => {
    const okStatus = !status || f.status === status;
    const qq = q.trim().toLowerCase();
    const okQ = !qq || f.cliente_nome?.toLowerCase().includes(qq) || f.cliente_matricula?.toLowerCase().includes(qq) || f.numero.toLowerCase().includes(qq);
    return okStatus && okQ;
  });

  async function estornar(p: Pagamento) {
    if (!window.confirm(`Estornar o pagamento de ${moeda(p.valor)} da fatura ${p.fatura_numero}?`)) return;
    try {
      await api(`/api/pagamentos/${p.id}`, { method: "DELETE" });
      await carregar();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao estornar pagamento");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Cobranças e Pagamentos</h1>
          <p>Acompanhe faturas em aberto e registre recebimentos</p>
        </div>
        <button className="btn btn-ghost" onClick={carregar}>
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {carregando ? (
        <div className="loading">Carregando cobranças...</div>
      ) : falha ? (
        <div className="alert alert-err">{falha}</div>
      ) : (
        <>
          <div className="card">
            <div className="card-head">
              <h2>Faturas em aberto</h2>
              <div className="toolbar">
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 150 }}>
                  <option value="">Pendente e vencida</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Vencida">Vencida</option>
                </select>
                <input
                  className="input"
                  placeholder="Buscar fatura ou cliente..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ minWidth: 220 }}
                />
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Competência</th>
                    <th className="num">Valor</th>
                    <th>Vencimento</th>
                    <th>Situação</th>
                    <th className="txt-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty">
                        Nenhuma fatura em aberto
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
                        <td>{f.mes_referencia}</td>
                        <td className="num">
                          <b>{moeda(f.valor_total)}</b>
                        </td>
                        <td>{dataCurta(f.data_vencimento)}</td>
                        <td>
                          <Badge valor={f.status} />
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button className="btn btn-primary btn-sm" onClick={() => setPagamentoDe(f)}>
                              <Banknote size={13} /> Registrar pagamento
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>Últimos pagamentos</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Fatura</th>
                    <th>Forma</th>
                    <th className="num">Valor</th>
                    <th className="txt-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty">
                        Nenhum pagamento registrado
                      </td>
                    </tr>
                  ) : (
                    pagamentos.map((p) => (
                      <tr key={p.id}>
                        <td>{dataCurta(p.data_pagamento)}</td>
                        <td>{p.cliente_nome}</td>
                        <td>{p.fatura_numero}</td>
                        <td>
                          <span className="badge badge-faturada">{p.forma_pagamento}</span>
                        </td>
                        <td className="num">
                          <b>{moeda(p.valor)}</b>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button className="btn btn-danger btn-sm" onClick={() => estornar(p)} title="Estornar pagamento">
                              <RotateCcw size={13} /> Estornar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {pagamentoDe && (
        <PaymentModal
          fatura={pagamentoDe}
          onFechar={() => setPagamentoDe(null)}
          onSalvo={() => {
            setPagamentoDe(null);
            carregar();
          }}
        />
      )}
    </>
  );
}

function PaymentModal({ fatura, onFechar, onSalvo }: { fatura: Fatura; onFechar: () => void; onSalvo: () => void }) {
  const [saldo, setSaldo] = useState(fatura.valor_total);
  const [valor, setValor] = useState(String(fatura.valor_total));
  const [dataPgto, setDataPgto] = useState(hoje());
  const [forma, setForma] = useState("Pix");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoSaldo, setCarregandoSaldo] = useState(true);

  useEffect(() => {
    api<Fatura & { pagamentos: Pagamento[] }>(`/api/faturas/${fatura.id}`)
      .then((d) => {
        const pago = d.pagamentos.reduce((s, p) => s + p.valor, 0);
        const resto = Math.round((d.valor_total - pago) * 100) / 100;
        setSaldo(resto);
        setValor(String(resto));
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar fatura"))
      .finally(() => setCarregandoSaldo(false));
  }, [fatura.id]);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await api("/api/pagamentos", {
        method: "POST",
        json: { fatura_id: fatura.id, valor: Number(valor), data_pagamento: dataPgto, forma_pagamento: forma, observacao: obs },
      });
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao registrar pagamento");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Registrar pagamento"
      subtitulo={`Fatura ${fatura.numero} · ${fatura.cliente_nome} · ${mesAno(fatura.mes_referencia)}`}
      onClose={onFechar}
    >
      {carregandoSaldo ? (
        <div className="loading">Carregando fatura...</div>
      ) : (
        <>
          <div className="resumo-preview" style={{ marginBottom: 16 }}>
            <span>
              Valor da fatura: <b>{moeda(fatura.valor_total)}</b>
            </span>
            <span>
              Saldo em aberto: <b>{moeda(saldo)}</b>
            </span>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Valor (R$) *</label>
              <input className="input" type="number" min="0.01" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="field">
              <label>Data do pagamento</label>
              <input type="date" className="input" value={dataPgto} onChange={(e) => setDataPgto(e.target.value)} />
            </div>
            <div className="field" style={{ gridColumn: "span 2" }}>
              <label>Forma de pagamento</label>
              <select className="input" value={forma} onChange={(e) => setForma(e.target.value)}>
                {FORMAS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ gridColumn: "span 2" }}>
              <label>Observação</label>
              <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          {erro && <div className="alert alert-err" style={{ marginTop: 14 }}>{erro}</div>}

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onFechar}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando || Number(valor) <= 0}>
              <CreditCard size={15} />
              {salvando ? "Registrando..." : "Confirmar recebimento"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function mesAno(ym: string): string {
  const [a, m] = ym.split("-");
  return `${m}/${a}`;
}