import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { readDB, writeDB } from './db';

export const ADMIN_COOKIE = 'afro_admin';

// Password source of truth (in order):
//   1. ADMIN_PASSWORD env variable (recommended for production)
//   2. Hash stored in data/shop-db.json (set on first boot or via change-password)
//   3. First boot: a random password is generated, persisted and printed
//      ONCE to the server console. It is NEVER shown in the UI.
const ENV_PASSWORD = () => process.env.ADMIN_PASSWORD || '';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 5;

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function legacyHash(pw: string): string {
  return createHash('sha256').update(`afro-admin-v1:${pw}`).digest('hex');
}

function checkStored(password: string, stored: string): boolean {
  if (stored.startsWith('scrypt$')) {
    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const next = scryptSync(password, salt, 32);
    const expected = Buffer.from(hash, 'hex');
    if (next.length !== expected.length) return false;
    return timingSafeEqual(next, expected);
  }
  if (!/^[a-f0-9]{64}$/.test(stored)) return false;
  return safeEqual(legacyHash(password), stored);
}

export async function getPasswordHash(): Promise<string> {
  if (ENV_PASSWORD()) return legacyHash(ENV_PASSWORD());
  const db = await readDB();
  if (db.admin?.passwordHash) return db.admin.passwordHash;
  const generated = randomBytes(12).toString('base64url');
  db.admin = {
    passwordHash: hashPassword(generated),
    updatedAt: new Date().toISOString(),
    profile: db.admin?.profile,
    sessions: db.admin?.sessions,
  };
  await writeDB(db);
  console.log(`\n[afro-admin] No ADMIN_PASSWORD set — generated one (shown once, stored in data/shop-db.json):\n[afro-admin]   ${generated}\n`);
  return db.admin.passwordHash;
}

export async function isPasswordSetViaEnv(): Promise<boolean> {
  return Boolean(ENV_PASSWORD());
}

export async function verifyPassword(password: string): Promise<boolean> {
  if (!password || password.length > 200) return false;
  const env = ENV_PASSWORD();
  if (env) {
    const a = createHash('sha256').update(`cmp:${password}`).digest();
    const b = createHash('sha256').update(`cmp:${env}`).digest();
    return timingSafeEqual(a, b);
  }
  const db = await readDB();
  const stored = db.admin?.passwordHash;
  if (!stored) {
    await getPasswordHash();
    return false;
  }
  const ok = checkStored(password, stored);
  if (ok && !stored.startsWith('scrypt$') && db.admin) {
    db.admin.passwordHash = hashPassword(password);
    db.admin.updatedAt = new Date().toISOString();
    await writeDB(db);
  }
  return ok;
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A random session. The raw token is only in the HttpOnly cookie, never derived from the password. */
export async function issueAdminSession(): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const db = await readDB();
  const now = Date.now();
  const sessions = (db.admin?.sessions || []).filter(s => s.expiresAt > now);
  sessions.push({ hash: tokenHash(token), expiresAt: now + SESSION_MS });
  db.admin = {
    passwordHash: db.admin?.passwordHash || '',
    updatedAt: db.admin?.updatedAt || new Date().toISOString(),
    profile: db.admin?.profile,
    sessions: sessions.slice(-MAX_SESSIONS),
  };
  await writeDB(db);
  return token;
}

export async function revokeAdminSession(req: Request): Promise<void> {
  const token = bearerFrom(req) || cookieValue(req);
  if (!token) return;
  const hash = tokenHash(token);
  const db = await readDB();
  if (!db.admin?.sessions) return;
  db.admin.sessions = db.admin.sessions.filter(s => !safeEqual(s.hash, hash));
  await writeDB(db);
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
  const token = bearerFrom(req) || cookieValue(req);
  if (!token || token.length > 200) return false;
  const hash = tokenHash(token);
  const db = await readDB();
  const now = Date.now();
  return (db.admin?.sessions || []).some(s => s.expiresAt > now && safeEqual(s.hash, hash));
}

function secureFlag(): string {
  return process.env.NODE_ENV === 'production' ? '; Secure' : '';
}

export function adminCookieHeader(token: string): string {
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}${secureFlag()}`;
}

export function clearAdminCookieHeader(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag()}`;
}

// ---- brute-force protection (in-memory, per process) ----
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const GLOBAL_MAX = 40;
let globalFails = 0;
let globalReset = 0;

/**
 * Client address for rate limits.
 * X-Forwarded-For is ignored unless TRUST_PROXY=1, because a visitor can invent that header
 * and walk around a per-address lockout. When trusted, the last hop is the one the proxy added.
 */
export function clientIp(req: Request): string {
  if (process.env.TRUST_PROXY === '1') {
    const real = req.headers.get('x-real-ip');
    if (real) return real.trim().slice(0, 64);
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) {
      const parts = fwd.split(',').map(s => s.trim()).filter(Boolean);
      const last = parts[parts.length - 1];
      if (last) return last.slice(0, 64);
    }
  }
  return 'direct';
}

export function loginBlocked(ip: string): boolean {
  const now = Date.now();
  if (now > globalReset) {
    globalFails = 0;
    globalReset = now + WINDOW_MS;
  }
  if (globalFails >= GLOBAL_MAX) return true;
  const cur = attempts.get(ip);
  if (!cur) return false;
  if (now > cur.resetAt) {
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
  globalFails += 1;
  if (!globalReset) globalReset = Date.now() + WINDOW_MS;
  const cur = attempts.get(ip) ?? { count: 0, resetAt: Date.now() + WINDOW_MS };
  if (Date.now() > cur.resetAt) {
    cur.count = 0;
    cur.resetAt = Date.now() + WINDOW_MS;
  }
  cur.count += 1;
  attempts.set(ip, cur);
}

const hits = new Map<string, { count: number; resetAt: number }>();

/** True when this key has gone past `max` calls inside the window. */
export function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const cur = hits.get(key);
  if (!cur || now > cur.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  cur.count += 1;
  return cur.count > max;
}
