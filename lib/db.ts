import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ensureShopSchema, loadShop, saveShop } from './neon-store';
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

export function seedProducts(): ProductFull[] {
  const t = new Date().toISOString();
  const base: Omit<ProductFull, 'createdAt' | 'updatedAt'>[] = [
    { id: 'masaki', name: 'Masaki Modular Sofa', category: 'Living Room', price: 2450000, oldPrice: 2750000, image: 'hero', material: 'Textured upholstery', dimensions: '240 × 95 × 78 cm', color: 'Terracotta', stock: 8, description: 'Deep-seat modular sofa for everyday living and hosting. Stain-resistant weave, solid frame.', featured: true, active: true },
    { id: 'bahari', name: 'Bahari Dining Set', category: 'Dining Room', price: 1850000, image: 'dining', material: 'Natural wood', dimensions: '180 × 90 × 75 cm', color: 'Natural', stock: 5, description: 'Six-seat dining set in natural hardwood. Seats family meals and meetings comfortably.', featured: true, active: true },
    { id: 'kariakoo', name: 'Kariakoo Accent Seat', category: 'Living Room', price: 680000, image: 'sofa', material: 'Woven upholstery', dimensions: '120 × 70 × 76 cm', color: 'Coral', stock: 12, description: 'Compact accent seat that brightens corners, lounges and reception areas.', featured: true, active: true },
    { id: 'mikocheni-bed', name: 'Mikocheni Queen Bed', category: 'Bedroom', price: 1650000, image: 'hero', material: 'Hardwood + upholstered headboard', dimensions: '160 × 200 cm', color: 'Beige', stock: 6, description: 'Queen bed with padded headboard and under-bed clearance for storage.', featured: true, active: true },
    { id: 'upanga-desk', name: 'Upanga Office Desk', category: 'Office', price: 540000, image: 'dining', material: 'Engineered wood + steel', dimensions: '140 × 70 × 75 cm', color: 'Walnut', stock: 15, description: 'Sturdy work desk with cable management for home and commercial offices.', featured: false, active: true },
    { id: 'masaki-armchair', name: 'Masaki Armchair', category: 'Living Room', price: 720000, image: 'sofa', material: 'Boucle upholstery', dimensions: '85 × 80 × 78 cm', color: 'Cream', stock: 10, description: 'Plush armchair with solid legs. Pairs with the Masaki sofa or stands alone.', featured: false, active: true },
    { id: 'oyster-bay-table', name: 'Oyster Bay Coffee Table', category: 'Living Room', price: 380000, image: 'dining', material: 'Mango wood', dimensions: '110 × 60 × 42 cm', color: 'Natural', stock: 20, description: 'Low coffee table with shelf for books and remotes.', featured: false, active: true },
    { id: 'kigamboni-outdoor', name: 'Kigamboni Outdoor Set', category: 'Outdoor', price: 1280000, image: 'sofa', material: 'Weather-proof rattan + steel', dimensions: '4 seats + table', color: 'Sand', stock: 4, description: 'Balcony-ready 4-seat set that handles coastal air and sun.', featured: true, active: true },
    { id: 'temeke-bunk', name: 'Temeke School Bunk', category: 'Bedroom', price: 890000, image: 'hero', material: 'Steel frame + hardwood slats', dimensions: '90 × 190 cm ×2', color: 'Grey', stock: 25, description: 'Institutional-grade bunk for schools, hostels and staff housing.', featured: false, active: true },
    { id: 'ilala-waiting', name: 'Ilala Waiting Bench', category: 'Office', price: 960000, image: 'sofa', material: 'Steel + padded vinyl', dimensions: '180 × 60 × 85 cm', color: 'Forest', stock: 9, description: 'Three-seat waiting bench for hospitals, banks and reception areas.', featured: false, active: true },
    { id: 'tandale-wardrobe', name: 'Tandale Wardrobe', category: 'Bedroom', price: 1120000, image: 'dining', material: 'Engineered wood', dimensions: '160 × 55 × 200 cm', color: 'Oak', stock: 7, description: 'Double-door wardrobe with hanging rail, shelves and lockable drawer.', featured: false, active: true },
    { id: 'africa-union-board', name: 'Boardroom Table 10-Seat', category: 'Office', price: 3200000, image: 'dining', material: 'Hardwood veneer', dimensions: '300 × 120 × 75 cm', color: 'Dark walnut', stock: 3, description: 'Executive 10-seat boardroom table for offices and institutions.', featured: true, active: true },
  ];
  return base.map(p => ({ ...p, createdAt: t, updatedAt: t }));
}

function emptyDB(): ShopDB {
  return { products: seedProducts(), orders: [], visits: [], customers: [], contacts: [], hiddenCustomerKeys: [] };
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
  if (process.env.DATABASE_URL) {
    await ensureShopSchema(seedProducts);
    return loadShop();
  }
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
  if (process.env.DATABASE_URL) {
    await ensureShopSchema(seedProducts);
    await saveShop(db);
    return;
  }
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
