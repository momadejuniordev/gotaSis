const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function brl(v: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));
}

export function numeroBR(v: number | null | undefined, casas = 2): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(
    Number(v ?? 0),
  );
}

export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  if (!a || !m || !d) return iso;
  return `${d}/${m}/${a}`;
}

export function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function mesAtual(): string {
  return hoje().slice(0, 7);
}

export function ultimosMeses(n: number): string[] {
  const d = new Date();
  d.setDate(1);
  const meses: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const aux = new Date(d.getFullYear(), d.getMonth() - i, 1);
    meses.push(`${aux.getFullYear()}-${pad2(aux.getMonth() + 1)}`);
  }
  return meses;
}

export function mesLabel(ym: string): string {
  const [a, m] = ym.split("-");
  const idx = Number(m) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx > 11) return ym;
  return `${MESES_CURTO[idx]}/${a?.slice(2)}`;
}