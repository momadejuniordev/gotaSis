"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { dataCurta } from "@/lib/format";
import type { Cliente } from "@/lib/types";

type FormCliente = {
  nome: string;
  matricula: string;
  documento: string;
  tipo: string;
  telefone: string;
  email: string;
  endereco: string;
  bairro: string;
  cidade: string;
  cep: string;
  hidrometro: string;
  status: string;
};

const FORM_INICIAL: FormCliente = {
  nome: "",
  matricula: "",
  documento: "",
  tipo: "Residencial",
  telefone: "",
  email: "",
  endereco: "",
  bairro: "",
  cidade: "",
  cep: "",
  hidrometro: "",
  status: "Ativo",
};

const TIPOS = ["Residencial", "Comercial", "Industrial", "Público", "Agrícola"];

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falha, setFalha] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormCliente>(FORM_INICIAL);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setFalha(null);
      setClientes(await api<Cliente[]>("/api/clientes"));
    } catch (e) {
      setFalha(e instanceof Error ? e.message : "Erro ao carregar clientes");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return clientes.filter((c) => {
      const okTipo = !tipo || c.tipo === tipo;
      const okQ =
        !qq ||
        [c.nome, c.matricula, c.documento, c.hidrometro].some((x) => x?.toLowerCase().includes(qq));
      return okTipo && okQ;
    });
  }, [clientes, q, tipo]);

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_INICIAL);
    setErroForm(null);
    setModalAberto(true);
  }

  function abrirEdicao(c: Cliente) {
    setEditando(c);
    setForm({
      nome: c.nome,
      matricula: c.matricula,
      documento: c.documento ?? "",
      tipo: c.tipo,
      telefone: c.telefone ?? "",
      email: c.email ?? "",
      endereco: c.endereco ?? "",
      bairro: c.bairro ?? "",
      cidade: c.cidade ?? "",
      cep: c.cep ?? "",
      hidrometro: c.hidrometro ?? "",
      status: c.status,
    });
    setErroForm(null);
    setModalAberto(true);
  }

  async function salvar() {
    setSalvando(true);
    setErroForm(null);
    try {
      if (editando) {
        await api(`/api/clientes/${editando.id}`, { method: "PUT", json: form });
      } else {
        await api<Cliente>("/api/clientes", { method: "POST", json: form });
      }
      setModalAberto(false);
      await carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar cliente");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(c: Cliente) {
    if (!window.confirm(`Excluir o cliente "${c.nome}"? O histórico ficará indisponível.`)) return;
    try {
      await api(`/api/clientes/${c.id}`, { method: "DELETE" });
      await carregar();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  const setCampo = (k: keyof FormCliente) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>Cadastro de clientes, imóveis e hidrômetros</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>
          <Plus size={16} /> Novo cliente
        </button>
      </div>

      <div className="card">
        <div className="toolbar" style={{ marginBottom: 14 }}>
          <span className="input" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Search size={15} style={{ color: "#64748b" }} />
            <input
              style={{ border: 0, outline: "none", flex: 1, fontFamily: "inherit", fontSize: 13.5 }}
              placeholder="Buscar por nome, matrícula, CPF/CNPJ ou hidrômetro..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </span>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: 170 }}>
            <option value="">Todos os tipos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {carregando ? (
          <div className="loading">Carregando clientes...</div>
        ) : falha ? (
          <div className="alert alert-err">{falha}</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Documento</th>
                  <th>Cidade</th>
                  <th>Hidrômetro</th>
                  <th>Status</th>
                  <th className="txt-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                ) : (
                  filtrados.map((c) => (
                    <tr key={c.id}>
                      <td>{c.matricula}</td>
                      <td>
                        <div>{c.nome}</div>
                        {c.email && (
                          <div className="muted" style={{ fontSize: 11.5 }}>
                            {c.email}
                          </div>
                        )}
                      </td>
                      <td>{c.tipo}</td>
                      <td>{c.documento ?? "—"}</td>
                      <td>{c.cidade ?? "—"}</td>
                      <td>{c.hidrometro ?? "—"}</td>
                      <td>
                        <Badge valor={c.status} />
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn btn-ghost btn-sm" onClick={() => abrirEdicao(c)}>
                            <Pencil size={13} /> Editar
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => excluir(c)}>
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

      {modalAberto && (
        <Modal
          titulo={editando ? "Editar cliente" : "Novo cliente"}
          subtitulo={editando ? `Matrícula ${editando.matricula} · cadastrado em ${dataCurta(editando.criado_em)}` : "Preencha os dados do cliente"}
          onClose={() => setModalAberto(false)}
        >
          <div className="form-grid">
            <div className="field" style={{ gridColumn: "span 2" }}>
              <label>Nome *</label>
              <input className="input" value={form.nome} onChange={setCampo("nome")} placeholder="Nome da pessoa ou empresa" />
            </div>
            <div className="field">
              <label>Matrícula</label>
              <input className="input" value={form.matricula} onChange={setCampo("matricula")} placeholder="Auto se vazio" />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select className="input" value={form.tipo} onChange={setCampo("tipo")}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>CPF / CNPJ</label>
              <input className="input" value={form.documento} onChange={setCampo("documento")} placeholder="000.000.000-00" />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input className="input" value={form.telefone} onChange={setCampo("telefone")} placeholder="(00) 00000-0000" />
            </div>
            <div className="field" style={{ gridColumn: "span 2" }}>
              <label>E-mail</label>
              <input className="input" type="email" value={form.email} onChange={setCampo("email")} placeholder="email@exemplo.com" />
            </div>
            <div className="field" style={{ gridColumn: "span 2" }}>
              <label>Endereço</label>
              <input className="input" value={form.endereco} onChange={setCampo("endereco")} placeholder="Rua, número" />
            </div>
            <div className="field">
              <label>Bairro</label>
              <input className="input" value={form.bairro} onChange={setCampo("bairro")} />
            </div>
            <div className="field">
              <label>Cidade</label>
              <input className="input" value={form.cidade} onChange={setCampo("cidade")} />
            </div>
            <div className="field">
              <label>CEP</label>
              <input className="input" value={form.cep} onChange={setCampo("cep")} />
            </div>
            <div className="field">
              <label>Hidrômetro</label>
              <input className="input" value={form.hidrometro} onChange={setCampo("hidrometro")} placeholder="Nº do medidor" />
            </div>
            <div className="field">
              <label>Status</label>
              <select className="input" value={form.status} onChange={setCampo("status")}>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>

          {erroForm && <div className="alert alert-err" style={{ marginTop: 14 }}>{erroForm}</div>}

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar cliente"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}