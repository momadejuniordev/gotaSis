"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  titulo,
  subtitulo,
  onClose,
  children,
  largura,
}: {
  titulo: string;
  subtitulo?: string;
  onClose: () => void;
  children: React.ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" style={largura ? { width: largura } : undefined}>
        <div className="modal-head">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <span className="muted">{subtitulo}</span>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}