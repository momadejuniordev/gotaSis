import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  valor,
  detalhe,
  icone: Icon,
  cor,
}: {
  label: string;
  valor: string;
  detalhe?: string;
  icone: LucideIcon;
  cor: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: cor }}>
        <Icon size={20} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{valor}</div>
        {detalhe && <div className="stat-detail">{detalhe}</div>}
      </div>
    </div>
  );
}