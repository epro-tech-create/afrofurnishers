import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { readDB, writeDB } from './db';
import type { CustomerAccount, PublicCustomer } from './shop-types';

export const CUSTOMER_COOKIE = 'afro_customer';

const PLACEHOLDER_SECRET = 'afro-secret-change-me-in-env';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
let cachedSecret: string | null = null;

async function signingSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  const env = process.env.ADMIN_SECRET || '';
  if (env && env !== PLACEHOLDER_SECRET && env.length >= 16) {
    cachedSecret = env;
    return env;
  }
  const db = await readDB();
  if (db.sessionSecret && db.sessionSecret.length >= 32) {
    cachedSecret = db.sessionSecret;
    return db.sessionSecret;
  }
  db.sessionSecret = randomBytes(32).toString('hex');
  await writeDB(db);
  cachedSecret = db.sessionSecret;
  return db.sessionSecret;
}

export function phoneKey(input: string): string {
  const digits = (input || '').replace(/\D/g, '');
  if (digits.startsWith('255') && digits.length > 9) return digits.slice(-9);
  if (digits.startsWith('0') && digits.length > 9) return digits.slice(1);
  return digits.length > 9 ? digits.slice(-9) : digits;
}

export function hashCustomerPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyCustomerPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  if (next.length !== expected.length) return false;
  return timingSafeEqual(next, expected);
}

export function toPublicCustomer(account: CustomerAccount): PublicCustomer {
  return { id: account.id, name: account.name, phone: account.phone };
}

async function signSession(id: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${id}.${exp}`;
  const sig = createHmac('sha256', await signingSecret()).update(`customer:${payload}`).digest('hex');
  return `${payload}.${sig}`;
}

async function readSession(token: string | null): Promise<string | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  if (!id || !exp || !sig) return null;
  const payload = `${id}.${exp}`;
  const expected = createHmac('sha256', await signingSecret()).update(`customer:${payload}`).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;
  if (!/^cus_[a-f0-9]+$/.test(id)) return null;
  return id;
}

function cookieValue(req: Request): string | null {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie
    .split(';')
    .map(s => s.trim())
    .find(s => s.startsWith(`${CUSTOMER_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CUSTOMER_COOKIE.length + 1)) : null;
}

export async function getCustomer(req: Request): Promise<PublicCustomer | null> {
  if (process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET) {
    const { auth } = await import('./auth/server');
    const { data } = await auth.getSession();
    const user = data?.user;
    if (user?.id && user.email) {
      const name = (user.name || '').trim();
      return {
        id: user.id,
        name: name && !name.includes('@') ? name : user.email.split('@')[0],
        phone: '',
        email: user.email,
      };
    }
  }
  const id = await readSession(cookieValue(req));
  if (!id) return null;
  const db = await readDB();
  const account = db.customers.find(c => c.id === id);
  return account ? toPublicCustomer(account) : null;
}

export async function customerCookieHeader(id: string): Promise<string> {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${CUSTOMER_COOKIE}=${encodeURIComponent(await signSession(id))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearCustomerCookieHeader(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${CUSTOMER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

const DUMMY_PASSWORD_HASH = hashCustomerPassword('not-a-real-account');

/** Spend the same time as a real check when the phone is unknown. */
export function disguiseMissingAccount(password: string): void {
  verifyCustomerPassword(password, DUMMY_PASSWORD_HASH);
}

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function customerLoginBlocked(ip: string): boolean {
  const cur = attempts.get(ip);
  if (!cur) return false;
  if (Date.now() > cur.resetAt) {
    attempts.delete(ip);
    return false;
  }
  return cur.count >= MAX_ATTEMPTS;
}

export function recordCustomerLogin(ip: string, ok: boolean): void {
  if (ok) {
    attempts.delete(ip);
    return;
  }
  const cur = attempts.get(ip);
  if (!cur || Date.now() > cur.resetAt) {
    attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
    return;
  }
  cur.count += 1;
}

export async function findCustomerByPhone(phone: string): Promise<CustomerAccount | undefined> {
  const db = await readDB();
  const key = phoneKey(phone);
  return db.customers.find(c => phoneKey(c.phone) === key);
}

export async function createCustomer(input: { name: string; phone: string; password: string }): Promise<PublicCustomer> {
  const db = await readDB();
  const key = phoneKey(input.phone);
  if (db.customers.some(c => phoneKey(c.phone) === key)) {
    throw new Error('An account with this phone already exists. Sign in instead.');
  }
  const account: CustomerAccount = {
    id: `cus_${randomBytes(8).toString('hex')}`,
    name: input.name.trim(),
    phone: input.phone.trim(),
    passwordHash: hashCustomerPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  db.customers.push(account);
  await writeDB(db);
  return toPublicCustomer(account);
}
