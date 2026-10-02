import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { AdminProfile, CustomerAccount, Order, ProductFull, ShopContact, Visit } from './shop-types';

export interface ShopDB {
  products: ProductFull[];
  orders: Order[];
  visits: Visit[];
  customers: CustomerAccount[];
  contacts: ShopContact[];
  hiddenCustomerKeys: string[];
  /** Random signing key used only when ADMIN_SECRET is not set. Never send this to the browser. */
  sessionSecret?: string;
  admin?: {
    passwordHash: string;
    updatedAt: string;
    profile?: AdminProfile;
    sessions?: { hash: string; expiresAt: number }[];
  };
}

function emptyDB(): ShopDB {
  return { products: [], orders: [], visits: [], customers: [], contacts: [], hiddenCustomerKeys: [] };
}

function dbPath(): string {
  // Vercel / serverless filesystems are read-only except /tmp — fall back there.
  const primary = path.join(process.cwd(), 'data', 'shop-db.json');
  return primary;
}

async function writablePath(): Promise<string> {
  const primary = dbPath();
  try {
    await fs.mkdir(path.dirname(primary), { recursive: true });
    return primary;
  } catch {
    const tmp = path.join('/tmp', 'afro-shop-db.json');
    return tmp;
  }
}

let cache: ShopDB | null = null;
let cachePath: string | null = null;

export async function readDB(): Promise<ShopDB> {
  if (cache) return cache;
  const primary = dbPath();
  const tmp = '/tmp/afro-shop-db.json';
  for (const p of [primary, tmp]) {
    try {
      const raw = await fs.readFile(/*turbopackIgnore: true*/ p, 'utf8');
      const parsed = JSON.parse(raw) as ShopDB;
      if (Array.isArray(parsed.products) && Array.isArray(parsed.orders)) {
        if (!Array.isArray(parsed.visits)) parsed.visits = [];
        if (!Array.isArray(parsed.customers)) parsed.customers = [];
        if (!Array.isArray(parsed.contacts)) parsed.contacts = [];
        if (!Array.isArray(parsed.hiddenCustomerKeys)) parsed.hiddenCustomerKeys = [];
        cache = parsed;
        cachePath = p;
        return parsed;
      }
    } catch { /* try next */ }
  }
  const seeded: ShopDB = emptyDB();
  cache = seeded;
  try {
    cachePath = await writablePath();
    await fs.writeFile(cachePath, JSON.stringify(seeded, null, 2), 'utf8');
  } catch { /* memory-only mode */ }
  return seeded;
}

export async function writeDB(db: ShopDB): Promise<void> {
  cache = db;
  const target = cachePath ?? (await writablePath());
  cachePath = target;
  try {
    await fs.writeFile(target, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // Last resort: /tmp
    try {
      await fs.writeFile('/tmp/afro-shop-db.json', JSON.stringify(db, null, 2), 'utf8');
      cachePath = '/tmp/afro-shop-db.json';
    } catch { /* memory-only */ }
  }
}

export function nextOrderId(orders: Order[]): string {
  const max = orders.reduce((m, o) => {
    const n = parseInt(o.id.replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 1000);
  return `AFR-${max + 1}`;
}

const MAX_VISITS = 20000;

export async function addVisit(input: { visitorId: string; path: string; referrer?: string }): Promise<void> {
  const db = await readDB();
  db.visits.push({
    id: randomUUID(),
    visitorId: input.visitorId,
    path: input.path,
    referrer: input.referrer,
    createdAt: new Date().toISOString(),
  });
  if (db.visits.length > MAX_VISITS) db.visits.splice(0, db.visits.length - MAX_VISITS);
  await writeDB(db);
}
