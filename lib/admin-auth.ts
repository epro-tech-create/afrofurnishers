import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { readDB, writeDB } from './db';

export const ADMIN_COOKIE = 'afro_admin';

// Password source of truth (in order):
//   1. ADMIN_PASSWORD env variable (recommended for production)
//   2. Hash stored in data/shop-db.json (set on first boot or via change-password)
//   3. First boot: a random password is generated, persisted and printed
//      ONCE to the server console. It is NEVER shown in the UI.
const ENV_PASSWORD = () => process.env.ADMIN_PASSWORD || '';
const SECRET = () => process.env.ADMIN_SECRET || 'afro-secret-change-me-in-env';

export function hashPassword(pw: string): string {
  return createHash('sha256').update(`afro-admin-v1:${pw}`).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function getPasswordHash(): Promise<string> {
  if (ENV_PASSWORD()) return hashPassword(ENV_PASSWORD());
  const db = await readDB();
  if (db.admin?.passwordHash) return db.admin.passwordHash;
  const generated = randomBytes(12).toString('base64url');
  db.admin = { passwordHash: hashPassword(generated), updatedAt: new Date().toISOString(), profile: db.admin?.profile };
  await writeDB(db);
  console.log(`\n[afro-admin] No ADMIN_PASSWORD set — generated one (shown once, stored in data/shop-db.json):\n[afro-admin]   ${generated}\n`);
  return db.admin.passwordHash;
}

export async function isPasswordSetViaEnv(): Promise<boolean> {
  return Boolean(ENV_PASSWORD());
}

export async function verifyPassword(password: string): Promise<boolean> {
  const expected = await getPasswordHash();
  return safeEqual(hashPassword(password), expected);
}

/** Stable bearer token — changes automatically when the password changes. */
export async function adminToken(): Promise<string> {
  const hash = await getPasswordHash();
  return createHmac('sha256', SECRET()).update(`bearer:${hash}`).digest('hex');
}

function bearerFrom(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function cookieValue(req: Request): string | null {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie
    .split(';')
    .map(s => s.trim())
    .find(s => s.startsWith(`${ADMIN_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(ADMIN_COOKIE.length + 1)) : null;
}

export async function isAdminRequest(req: Request): Promise<boolean> {
  const expected = await adminToken();
  const bearer = bearerFrom(req);
  if (bearer && safeEqual(bearer, expected)) return true;
  const cookie = cookieValue(req);
  if (cookie && safeEqual(cookie, expected)) return true;
  return false;
}

export async function adminCookieHeader(): Promise<string> {
  return `${ADMIN_COOKIE}=${encodeURIComponent(await adminToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function clearAdminCookieHeader(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ---- brute-force protection (in-memory, per process) ----
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'local';
}

export function loginBlocked(ip: string): boolean {
  const cur = attempts.get(ip);
  if (!cur) return false;
  if (Date.now() > cur.resetAt) {
    attempts.delete(ip);
    return false;
  }
  return cur.count >= MAX_ATTEMPTS;
}

export function recordLoginAttempt(ip: string, ok: boolean) {
  if (ok) {
    attempts.delete(ip);
    return;
  }
  const cur = attempts.get(ip) ?? { count: 0, resetAt: Date.now() + WINDOW_MS };
  cur.count += 1;
  attempts.set(ip, cur);
}
