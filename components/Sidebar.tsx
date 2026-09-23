"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Droplets, FileText, Gauge, LayoutDashboard, Users } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/leituras", label: "Leituras", icon: Gauge },
  { href: "/faturamento", label: "Faturamento", icon: FileText },
  { href: "/cobrancas", label: "Cobranças e Pagamentos", icon: CreditCard },
];

export function Sidebar({ empresa }: { empresa: string }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Droplets size={20} />
        </div>
        <div>
          <div className="brand-name">GotaSis</div>
          <span className="brand-sub">{empresa}</span>
        </div>
      </div>

      <nav className="nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          const ativo = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={ativo ? "active" : undefined}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">Gestão de água v1.0</div>
    </aside>
  );
}