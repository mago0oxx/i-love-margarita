import { DatabaseSync, backup } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
const directory = process.env.ILM_DATA_DIR || path.resolve("data");
const source = path.join(directory, "business.sqlite");
if (!existsSync(source))
  throw new Error(
    "Todavía no existe la base de datos. Abre primero la aplicación.",
  );
mkdirSync(path.join(directory, "backups"), { recursive: true });
const target = path.join(
  directory,
  "backups",
  `margarita-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
);
const db = new DatabaseSync(source);
await backup(db, target);
db.close();
console.log("Respaldo completo creado: " + target);
