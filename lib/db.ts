import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { initSchema } from "./schema";
import { seedIfEmpty } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "gotasis.sqlite");

declare global {
  // eslint-disable-next-line no-var
  var __gotasisDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!global.__gotasisDb) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
    seedIfEmpty(db);
    global.__gotasisDb = db;
  }
  return global.__gotasisDb;
}