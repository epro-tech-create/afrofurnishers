import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { hashPassword, loginBlocked, passwordMatches, recordLoginAttempt } from './admin-auth';
import { recordAudit } from './audit';
import { ensureShopSchema, loadSuperadminState, saveSuperadminState, type SuperadminState } from './neon-store';

export const SUPER_COOKIE = 'afro_super';
const SESSION_MS = 12 * 60 * 60 * 1000;
const MAX_SESSIONS = 3;
const FILE = path.join(process.cwd(), 'data', 'superadmin.json');

/** Hash of the seeded password. The password is not stored in the repository. */
const SEEDED_PASSWORD_HASH = 'scrypt$b888670d915bbcf401ab20d5568df290$1c155c194a7091088f5217e0d8858bc6d02d066a28584e6cc3905c064388baa4';

function envPassword(): string {
  return process.env.SUPERADMIN_PASSWORD || '';
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

async function readState(): Promise<SuperadminState | null> {
  if (process.env.DATABASE_URL) {
    await ensureShopSchema();
    return loadSuperadminState();
  }
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw) as SuperadminState;
    if (!parsed?.passwordHash) return null;
    return {
      passwordHash: parsed.passwordHash,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return null;
  }
}

async function writeState(state: SuperadminState): Promise<void> {
  if (process.env.DATABASE_URL) {
    await ensureShopSchema();
    await saveSuperadminState(state);
    return;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(state), 'utf8');
}

export async function ensureSuperadmin(): Promise<SuperadminState> {
  const current = await readState();
  if (current?.passwordHash) return current;
  const next: SuperadminState = {
    passwordHash: SEEDED_PASSWORD_HASH,
    updatedAt: new Date().toISOString(),
    sessions: [],
  };
  await writeState(next);
  await recordAudit({ actor: 'system', action: 'superadmin.seeded', detail: 'Super admin password stored in the shop database' });
  return next;
}

export function superadminPasswordFromEnv(): boolean {
  return Boolean(envPassword());
}

export async function verifySuperadminPassword(password: string): Promise<boolean> {
  if (!password || password.length > 200) return false;
  const env = envPassword();
  if (env) {
    const a = createHash('sha256').update(`cmp:${password}`).digest();
    const b = createHash('sha256').update(`cmp:${env}`).digest();
    return timingSafeEqual(a, b);
  }
  const state = await ensureSuperadmin();
  return passwordMatches(password, state.passwordHash);
}

export async function issueSuperadminSession(): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const state = await ensureSuperadmin();
  const now = Date.now();
  const sessions = state.sessions.filter(s => s.expiresAt > now);
  sessions.push({ hash: tokenHash(token), expiresAt: now + SESSION_MS });
  await writeState({
    ...state,
    sessions: sessions.slice(-MAX_SESSIONS),
  });
  return token;
}

export async function revokeSuperadminSession(req: Request): Promise<void> {
  const token = cookieValue(req);
  if (!token) return;
  const hash = tokenHash(token);
  const state = await readState();
  if (!state) return;
  state.sessions = state.sessions.filter(s => !safeEqual(s.hash, hash));
  await writeState(state);
}

function cookieValue(req: Request): string | null {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.split(';').map(s => s.trim()).find(s => s.startsWith(`${SUPER_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(SUPER_COOKIE.length + 1)) : null;
}

export async function isSuperadminRequest(req: Request): Promise<boolean> {
  const token = cookieValue(req);
  if (!token || token.length > 200) return false;
  const hash = tokenHash(token);
  const state = await readState();
  if (!state) return false;
  const now = Date.now();
  return state.sessions.some(s => s.expiresAt > now && safeEqual(s.hash, hash));
}

export async function changeSuperadminPassword(current: string, next: string): Promise<{ ok: true } | { error: string; status: number }> {
  if (envPassword()) return { error: 'Password is set via SUPERADMIN_PASSWORD. Change it on the server.', status: 400 };
  if (next.length < 10 || next.length > 200) return { error: 'New password must be 10 to 200 characters.', status: 400 };
  const state = await ensureSuperadmin();
  if (!passwordMatches(current, state.passwordHash)) return { error: 'Current password is wrong.', status: 401 };
  await writeState({
    passwordHash: hashPassword(next),
    updatedAt: new Date().toISOString(),
    sessions: [],
  });
  return { ok: true };
}

function secureFlag(): string {
  return process.env.NODE_ENV === 'production' ? '; Secure' : '';
}

export function superadminCookieHeader(token: string): string {
  return `${SUPER_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}${secureFlag()}`;
}

export function clearSuperadminCookieHeader(): string {
  return `${SUPER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag()}`;
}

export function superadminLoginBlocked(ip: string): boolean {
  return loginBlocked(`super:${ip}`);
}

export function recordSuperadminLogin(ip: string, ok: boolean): void {
  recordLoginAttempt(`super:${ip}`, ok);
}
