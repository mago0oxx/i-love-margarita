import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { db } from "./db";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export function authenticated(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("ilm_session="))
    ?.slice(12);
  if (!token) return false;
  return !!db()
    .prepare("SELECT token FROM sessions WHERE token=? AND expires>?")
    .get(digest(token), Date.now());
}
export function login(email: string, password: string) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const salt = process.env.ADMIN_PASSWORD_SALT;
  if (
    !hash ||
    !salt ||
    email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()
  )
    return null;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;
  const token = randomBytes(32).toString("hex");
  db().prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
  db()
    .prepare("INSERT INTO sessions VALUES (?,?)")
    .run(digest(token), Date.now() + 8 * 60 * 60 * 1000);
  return token;
}
export function sessionCookie(token: string, request: Request, maxAge = 28800) {
  return `ilm_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(process.env.APP_ORIGIN || request.url).protocol === "https:" ? "; Secure" : ""}`;
}
