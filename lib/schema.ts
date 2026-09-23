import type Database from "better-sqlite3";

export function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricula TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      documento TEXT,
      tipo TEXT NOT NULL DEFAULT 'Residencial',
      telefone TEXT,
      email TEXT,
      endereco TEXT,
      bairro TEXT,
      cidade TEXT,
      cep TEXT,
      hidrometro TEXT,
      status TEXT NOT NULL DEFAULT 'Ativo',
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS leituras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      data_leitura TEXT NOT NULL,
      leitura_anterior REAL NOT NULL DEFAULT 0,
      leitura_atual REAL NOT NULL,
      consumo_m3 REAL NOT NULL,
      leitor TEXT,
      observacao TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_leituras_cliente ON leituras(cliente_id, data_leitura);

    CREATE TABLE IF NOT EXISTS faturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL UNIQUE,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      leitura_id INTEGER REFERENCES leituras(id) ON DELETE SET NULL,
      mes_referencia TEXT NOT NULL,
      consumo_m3 REAL NOT NULL DEFAULT 0,
      taxa_fixa REAL NOT NULL DEFAULT 0,
      tarifa_agua REAL NOT NULL DEFAULT 0,
      tarifa_esgoto REAL NOT NULL DEFAULT 0,
      valor_total REAL NOT NULL,
      data_emissao TEXT NOT NULL,
      data_vencimento TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendente',
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_faturas_cliente ON faturas(cliente_id, mes_referencia);

    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fatura_id INTEGER NOT NULL REFERENCES faturas(id) ON DELETE CASCADE,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      valor REAL NOT NULL,
      data_pagamento TEXT NOT NULL,
      forma_pagamento TEXT NOT NULL DEFAULT 'Pix',
      observacao TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_pagamentos_fatura ON pagamentos(fatura_id);

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);
}