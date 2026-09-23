import { getDb } from "../lib/db";
import { resetAndSeed } from "../lib/seed";

const db = getDb();
resetAndSeed(db);

const clientes = (db.prepare("SELECT COUNT(*) n FROM clientes").get() as { n: number }).n;
const leituras = (db.prepare("SELECT COUNT(*) n FROM leituras").get() as { n: number }).n;
const faturas = (db.prepare("SELECT COUNT(*) n FROM faturas").get() as { n: number }).n;
const pagamentos = (db.prepare("SELECT COUNT(*) n FROM pagamentos").get() as { n: number }).n;

console.log("Banco recriado com dados de demonstração:");
console.log(`  clientes:   ${clientes}`);
console.log(`  leituras:   ${leituras}`);
console.log(`  faturas:    ${faturas}`);
console.log(`  pagamentos: ${pagamentos}`);