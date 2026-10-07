import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { seed, type Business } from "./model";
const directory = process.env.ILM_DATA_DIR || path.join(process.cwd(), "data");
let database: DatabaseSync;
export function db() {
  if (!database) {
    mkdirSync(directory, { recursive: true });
    database = new DatabaseSync(path.join(directory, "business.sqlite"));
    database.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS business (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, body BLOB NOT NULL); CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);",
    );
    database
      .prepare("INSERT OR IGNORE INTO business VALUES (1,?)")
      .run(JSON.stringify(seed()));
  }
  return database;
}
export function read(): Business {
  return JSON.parse(
    (
      db().prepare("SELECT document FROM business WHERE id=1").get() as {
        document: string;
      }
    ).document,
  );
}
export function transaction<T>(fn: (state: Business) => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const state = read();
    const result = fn(state);
    d.prepare("UPDATE business SET document=? WHERE id=1").run(
      JSON.stringify(state),
    );
    d.exec("COMMIT");
    return result;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export function limit(key: string, max = 20) {
  const now = Date.now();
  db().prepare("DELETE FROM limits WHERE expires < ?").run(now);
  db()
    .prepare(
      "INSERT INTO limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
    )
    .run(key, now + 15 * 60 * 1000);
  return (
    (
      db().prepare("SELECT count FROM limits WHERE key=?").get(key) as {
        count: number;
      }
    ).count <= max
  );
}
