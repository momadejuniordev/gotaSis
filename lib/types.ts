export type StatusCliente = "Ativo" | "Inativo";
export type StatusFatura = "Pendente" | "Paga" | "Vencida" | "Cancelada";
export type TipoCliente = "Residencial" | "Comercial" | "Industrial" | "Público" | "Agrícola";

export interface Cliente {
  id: number;
  matricula: string;
  nome: string;
  documento: string | null;
  tipo: TipoCliente;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  cep: string | null;
  hidrometro: string | null;
  status: StatusCliente;
  criado_em: string;
}

export interface Leitura {
  id: number;
  cliente_id: number;
  data_leitura: string;
  leitura_anterior: number;
  leitura_atual: number;
  consumo_m3: number;
  leitor: string | null;
  observacao: string | null;
  criado_em: string;
  cliente_nome?: string;
  cliente_matricula?: string;
  faturada?: number;
}

export interface Fatura {
  id: number;
  numero: string;
  cliente_id: number;
  leitura_id: number | null;
  mes_referencia: string;
  consumo_m3: number;
  taxa_fixa: number;
  tarifa_agua: number;
  tarifa_esgoto: number;
  valor_total: number;
  data_emissao: string;
  data_vencimento: string;
  status: StatusFatura;
  criado_em: string;
  cliente_nome?: string;
  cliente_matricula?: string;
}

export interface Pagamento {
  id: number;
  fatura_id: number;
  cliente_id: number;
  valor: number;
  data_pagamento: string;
  forma_pagamento: string;
  observacao: string | null;
  criado_em: string;
  cliente_nome?: string;
  fatura_numero?: string;
}

export interface ConfigSistema {
  nome_empresa: string;
  tarifa_agua_m3: number;
  tarifa_esgoto_m3: number;
  taxa_fixa: number;
  vencimento_dia: number;
}

export interface ResumoDashboard {
  clientes: number;
  clientesAtivos: number;
  faturadoMes: number;
  arrecadadoMes: number;
  consumoMes: number;
  inadimplencia: number;
  faturasAbertas: number;
}

export interface PontoSerie {
  mes: string;
  faturado: number;
  arrecadado: number;
  consumo: number;
}

export interface StatusFaturaResumo {
  status: StatusFatura;
  quantidade: number;
  valor: number;
}

export interface Inadimplente {
  cliente: string;
  matricula: string;
  valor: number;
  faturas: number;
}

export interface DashboardData {
  resumo: ResumoDashboard;
  serieMeses: PontoSerie[];
  statusFaturas: StatusFaturaResumo[];
  inadimplentes: Inadimplente[];
  ultimasFaturas: Fatura[];
}