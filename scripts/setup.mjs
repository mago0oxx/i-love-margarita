import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
if (existsSync(".env.local")) {
  console.log("Ya existe .env.local. No se reemplazaron las credenciales.");
  process.exit(0);
}
const email = process.argv[2] || "admin@ilovemargarita.local";
const password = randomBytes(15).toString("base64url");
const salt = randomBytes(24).toString("hex");
writeFileSync(
  ".env.local",
  `APP_ORIGIN=http://localhost:3000\nADMIN_EMAIL=${email}\nADMIN_PASSWORD_SALT=${salt}\nADMIN_PASSWORD_HASH=${scryptSync(password, salt, 64).toString("hex")}\n`,
  { mode: 0o600 },
);
mkdirSync("data", { recursive: true });
writeFileSync(
  "data/ACCESO-ADMIN.txt",
  `Panel: http://localhost:3000/admin\nEmail: ${email}\nContraseña: ${password}\n\nArchivo privado. No compartir ni incluir en Git.\n`,
  { mode: 0o600 },
);
console.log(
  "Administrador creado. Credenciales guardadas en data/ACCESO-ADMIN.txt",
);
