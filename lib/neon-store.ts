import { Pool, type PoolClient } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import type { AdminProfile, CustomerAccount, Order, OrderItem, ProductFull, ShopContact, Visit } from './shop-types';

type AdminState = {
  passwordHash: string;
  updatedAt: string;
  profile?: AdminProfile;
  sessions?: { hash: string; expiresAt: number }[];
};

export type ShopRecord = {
  products: ProductFull[];
  orders: Order[];
  visits: Visit[];
  customers: CustomerAccount[];
  contacts: ShopContact[];
  hiddenCustomerKeys: string[];
  sessionSecret?: string;
  admin?: AdminState;
};

const SCHEMA = `
create table if not exists products (
  id text primary key,
  name text not null,
  category text not null default '',
  price bigint not null check (price >= 0),
  old_price bigint check (old_price is null or old_price >= 0),
  image text not null default 'hero',
  material text not null default '',
  dimensions text not null default '',
  color text not null default '',
  stock integer not null default 0 check (stock >= 0),
  description text not null default '',
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists customers (
  id text primary key,
  name text not null,
  phone text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists contacts (
  id text primary key,
  name text not null,
  phone text not null,
  area text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists orders (
  id text primary key,
  customer_id text references customers (id) on delete set null,
  customer_name text not null,
  phone text not null,
  address text not null default '',
  area text not null default '',
  notes text not null default '',
  payment text not null check (payment in ('cod', 'shop')),
  subtotal bigint not null check (subtotal >= 0),
  delivery_fee bigint not null check (delivery_fee >= 0),
  total bigint not null check (total >= 0),
  status text not null check (status in ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled')),
  payment_status text not null check (payment_status in ('unpaid', 'paid')),
  source text not null check (source in ('website', 'whatsapp', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists order_items (
  id bigint generated always as identity primary key,
  order_id text not null references orders (id) on delete cascade,
  product_id text not null,
  name text not null,
  price bigint not null check (price >= 0),
  qty integer not null check (qty > 0),
  image text not null default ''
);
create table if not exists visits (
  id text primary key,
  visitor_id text not null,
  path text not null,
  referrer text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists hidden_customers (
  phone_key text primary key
);
create table if not exists app_state (
  id int primary key default 1 check (id = 1),
  session_secret text,
  admin jsonb
);
insert into app_state (id) values (1) on conflict (id) do nothing;
alter table app_state add column if not exists superadmin jsonb;
create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  target text not null default '',
  detail text not null default '',
  ip text not null default ''
);
create index if not exists audit_logs_at_idx on audit_logs (at desc);
create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);
create index if not exists order_items_order_id_idx on order_items (order_id);
alter table visits add column if not exists ip text not null default '';
create index if not exists visits_created_at_idx on visits (created_at desc);
`;

type Snap = {
  products: Map<string, string>;
  orders: Map<string, string>;
  customers: Map<string, string>;
  contacts: Map<string, string>;
  visits: Map<string, string>;
  hidden: string;
  sessionSecret: string;
  admin: string;
};

const snaps = new WeakMap<ShopRecord, Snap>();

function libpqUrl(raw: string): string {
  if (!raw) throw new Error('DATABASE_URL is not set');
  if (raw.includes('uselibpqcompat=')) return raw;
  return `${raw}${raw.includes('?') ? '&' : '?'}uselibpqcompat=true`;
}

const globalForPg = globalThis as unknown as { afroPool?: Pool };
let schemaReady: Promise<void> | null = null;

function pool(): Pool {
  if (!globalForPg.afroPool) {
    const next = new Pool({
      connectionString: libpqUrl(process.env.DATABASE_URL || ''),
      max: 10,
    });
    attachDatabasePool(next);
    globalForPg.afroPool = next;
  }
  return globalForPg.afroPool;
}

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value || '');
}

function takeSnap(db: ShopRecord): void {
  snaps.set(db, {
    products: new Map(db.products.map(row => [row.id, JSON.stringify(row)])),
    orders: new Map(db.orders.map(row => [row.id, JSON.stringify(row)])),
    customers: new Map(db.customers.map(row => [row.id, JSON.stringify(row)])),
    contacts: new Map(db.contacts.map(row => [row.id, JSON.stringify(row)])),
    visits: new Map(db.visits.map(row => [row.id, JSON.stringify(row)])),
    hidden: JSON.stringify([...db.hiddenCustomerKeys].sort()),
    sessionSecret: db.sessionSecret || '',
    admin: JSON.stringify(db.admin || null),
  });
}

async function insertProducts(client: Pool | PoolClient, products: ProductFull[]): Promise<void> {
  for (const product of products) {
    await client.query(
      `insert into products (id, name, category, price, old_price, image, material, dimensions, color, stock, description, featured, active, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       on conflict (id) do nothing`,
      [
        product.id, product.name, product.category, product.price, product.oldPrice ?? null, product.image,
        product.material, product.dimensions, product.color, product.stock, product.description,
        Boolean(product.featured), product.active, product.createdAt, product.updatedAt,
      ],
    );
  }
}

export function ensureShopSchema(seed?: () => ProductFull[]): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = new Pool({
        connectionString: libpqUrl(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || ''),
        max: 1,
      });
      try {
        const existed = await client.query(`select to_regclass('public.products') as name`);
        const hadProducts = Boolean(existed.rows[0]?.name);
        await client.query(SCHEMA);
        if (!hadProducts && seed) await insertProducts(client, seed());
      } finally {
        await client.end();
      }
    })().catch(error => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

export async function loadShop(): Promise<ShopRecord> {
  const db = pool();
  const [products, orders, items, customers, contacts, visits, hidden, state] = await Promise.all([
    db.query('select * from products order by created_at asc, id asc'),
    db.query('select * from orders order by created_at asc, id asc'),
    db.query('select * from order_items order by id asc'),
    db.query('select * from customers order by created_at asc, id asc'),
    db.query('select * from contacts order by created_at asc, id asc'),
    db.query('select * from visits order by created_at asc, id asc'),
    db.query('select phone_key from hidden_customers order by phone_key asc'),
    db.query('select session_secret, admin from app_state where id = 1'),
  ]);

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const row of items.rows) {
    const list = itemsByOrder.get(row.order_id) || [];
    list.push({
      productId: row.product_id,
      name: row.name,
      price: num(row.price),
      qty: num(row.qty),
      image: row.image || '',
    });
    itemsByOrder.set(row.order_id, list);
  }

  const shop: ShopRecord = {
    products: products.rows.map(row => {
      const product: ProductFull = {
        id: row.id,
        name: row.name,
        category: row.category || '',
        price: num(row.price),
        image: row.image || 'hero',
        material: row.material || '',
        dimensions: row.dimensions || '',
        color: row.color || '',
        stock: num(row.stock),
        description: row.description || '',
        featured: Boolean(row.featured),
        active: row.active !== false,
        createdAt: iso(row.created_at),
        updatedAt: iso(row.updated_at),
      };
      if (row.old_price != null) product.oldPrice = num(row.old_price);
      return product;
    }),
    orders: orders.rows.map(row => {
      const order: Order = {
        id: row.id,
        items: itemsByOrder.get(row.id) || [],
        customer: {
          name: row.customer_name,
          phone: row.phone,
          address: row.address || '',
          area: row.area || '',
        },
        payment: row.payment === 'shop' ? 'shop' : 'cod',
        subtotal: num(row.subtotal),
        deliveryFee: num(row.delivery_fee),
        total: num(row.total),
        status: row.status,
        paymentStatus: row.payment_status === 'paid' ? 'paid' : 'unpaid',
        source: row.source === 'admin' || row.source === 'whatsapp' ? row.source : 'website',
        createdAt: iso(row.created_at),
        updatedAt: iso(row.updated_at),
      };
      if (row.customer_id) order.customerId = row.customer_id;
      if (row.notes) order.customer.notes = row.notes;
      return order;
    }),
    visits: visits.rows.map(row => {
      const visit: Visit = {
        id: row.id,
        visitorId: row.visitor_id,
        path: row.path,
        createdAt: iso(row.created_at),
      };
      if (row.referrer) visit.referrer = row.referrer;
      if (row.ip) visit.ip = row.ip;
      return visit;
    }),
    customers: customers.rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      passwordHash: row.password_hash,
      createdAt: iso(row.created_at),
    } satisfies CustomerAccount)),
    contacts: contacts.rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      area: row.area || '',
      address: row.address || '',
      notes: row.notes || '',
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    } satisfies ShopContact)),
    hiddenCustomerKeys: hidden.rows.map(row => row.phone_key),
  };

  const saved = state.rows[0];
  if (saved?.session_secret) shop.sessionSecret = saved.session_secret;
  if (saved?.admin && typeof saved.admin === 'object') shop.admin = saved.admin as AdminState;
  takeSnap(shop);
  return shop;
}

async function upsertProduct(client: PoolClient, product: ProductFull): Promise<void> {
  await client.query(
    `insert into products (id, name, category, price, old_price, image, material, dimensions, color, stock, description, featured, active, created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     on conflict (id) do update set
       name = excluded.name, category = excluded.category, price = excluded.price, old_price = excluded.old_price,
       image = excluded.image, material = excluded.material, dimensions = excluded.dimensions, color = excluded.color,
       stock = excluded.stock, description = excluded.description, featured = excluded.featured, active = excluded.active,
       created_at = excluded.created_at, updated_at = excluded.updated_at`,
    [
      product.id, product.name, product.category, Math.round(product.price), product.oldPrice ?? null, product.image || 'hero',
      product.material || '', product.dimensions || '', product.color || '', Math.max(0, Math.floor(product.stock)),
      product.description || '', Boolean(product.featured), product.active !== false, product.createdAt, product.updatedAt,
    ],
  );
}

async function upsertOrder(client: PoolClient, order: Order): Promise<void> {
  await client.query(
    `insert into orders (id, customer_id, customer_name, phone, address, area, notes, payment, subtotal, delivery_fee, total, status, payment_status, source, created_at, updated_at)
     values ($1, (select id from customers where id = $2), $3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     on conflict (id) do update set
       customer_id = excluded.customer_id, customer_name = excluded.customer_name, phone = excluded.phone,
       address = excluded.address, area = excluded.area, notes = excluded.notes, payment = excluded.payment,
       subtotal = excluded.subtotal, delivery_fee = excluded.delivery_fee, total = excluded.total,
       status = excluded.status, payment_status = excluded.payment_status, source = excluded.source,
       created_at = excluded.created_at, updated_at = excluded.updated_at`,
    [
      order.id, order.customerId || null, order.customer.name, order.customer.phone, order.customer.address || '',
      order.customer.area || '', order.customer.notes || '', order.payment === 'shop' ? 'shop' : 'cod',
      Math.round(order.subtotal), Math.round(order.deliveryFee), Math.round(order.total), order.status,
      order.paymentStatus === 'paid' ? 'paid' : 'unpaid', order.source, order.createdAt, order.updatedAt,
    ],
  );
  await client.query('delete from order_items where order_id = $1', [order.id]);
  for (const item of order.items) {
    await client.query(
      `insert into order_items (order_id, product_id, name, price, qty, image) values ($1,$2,$3,$4,$5,$6)`,
      [order.id, item.productId, item.name, Math.round(item.price), item.qty, item.image || ''],
    );
  }
}

async function changedRows<T extends { id: string }>(
  client: PoolClient,
  table: string,
  rows: T[],
  previous: Map<string, string> | undefined,
  upsert: (client: PoolClient, row: T) => Promise<void>,
): Promise<void> {
  const ids = rows.map(row => row.id);
  if (!previous) {
    await client.query(`delete from ${table} where not (id = any($1::text[]))`, [ids]);
    for (const row of rows) await upsert(client, row);
    return;
  }
  const removed = [...previous.keys()].filter(id => !ids.includes(id));
  if (removed.length) await client.query(`delete from ${table} where id = any($1::text[])`, [removed]);
  for (const row of rows) {
    if (previous.get(row.id) !== JSON.stringify(row)) await upsert(client, row);
  }
}

export async function saveShop(db: ShopRecord): Promise<void> {
  const previous = snaps.get(db);
  const client = await pool().connect();
  try {
    await client.query('begin');
    await changedRows(client, 'products', db.products, previous?.products, upsertProduct);
    await changedRows(client, 'customers', db.customers, previous?.customers, async (c, row) => {
      await c.query(
        `insert into customers (id, name, phone, password_hash, created_at)
         values ($1,$2,$3,$4,$5)
         on conflict (id) do update set name = excluded.name, phone = excluded.phone, password_hash = excluded.password_hash, created_at = excluded.created_at`,
        [row.id, row.name, row.phone, row.passwordHash, row.createdAt],
      );
    });
    await changedRows(client, 'orders', db.orders, previous?.orders, upsertOrder);
    await changedRows(client, 'contacts', db.contacts, previous?.contacts, async (c, row) => {
      await c.query(
        `insert into contacts (id, name, phone, area, address, notes, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (id) do update set
           name = excluded.name, phone = excluded.phone, area = excluded.area, address = excluded.address,
           notes = excluded.notes, created_at = excluded.created_at, updated_at = excluded.updated_at`,
        [row.id, row.name, row.phone, row.area || '', row.address || '', row.notes || '', row.createdAt, row.updatedAt],
      );
    });
    await changedRows(client, 'visits', db.visits, previous?.visits, async (c, row) => {
      await c.query(
        `insert into visits (id, visitor_id, path, referrer, ip, created_at)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (id) do update set visitor_id = excluded.visitor_id, path = excluded.path, referrer = excluded.referrer, ip = excluded.ip, created_at = excluded.created_at`,
        [row.id, row.visitorId, row.path, row.referrer || '', row.ip || '', row.createdAt],
      );
    });

    const hidden = JSON.stringify([...db.hiddenCustomerKeys].sort());
    if (!previous || previous.hidden !== hidden) {
      await client.query('delete from hidden_customers');
      if (db.hiddenCustomerKeys.length) {
        await client.query('insert into hidden_customers (phone_key) select distinct unnest($1::text[])', [db.hiddenCustomerKeys]);
      }
    }

    const secret = db.sessionSecret || '';
    const admin = JSON.stringify(db.admin || null);
    if (!previous || previous.sessionSecret !== secret || previous.admin !== admin) {
      await client.query(
        `insert into app_state (id, session_secret, admin) values (1, $1, $2::jsonb)
         on conflict (id) do update set session_secret = excluded.session_secret, admin = excluded.admin`,
        [secret || null, db.admin ? JSON.stringify(db.admin) : null],
      );
    }
    await client.query('commit');
    takeSnap(db);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export type SuperadminState = {
  passwordHash: string;
  updatedAt: string;
  sessions: { hash: string; expiresAt: number }[];
};

function asSuperadmin(raw: unknown): SuperadminState | null {
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!value || typeof value !== 'object') return null;
  const row = value as SuperadminState;
  if (typeof row.passwordHash !== 'string' || !row.passwordHash) return null;
  return {
    passwordHash: row.passwordHash,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
    sessions: Array.isArray(row.sessions) ? row.sessions.filter(s => s && typeof s.hash === 'string' && typeof s.expiresAt === 'number') : [],
  };
}

export async function loadSuperadminState(): Promise<SuperadminState | null> {
  const result = await pool().query('select superadmin from app_state where id = 1');
  return asSuperadmin(result.rows[0]?.superadmin);
}

export async function saveSuperadminState(state: SuperadminState): Promise<void> {
  await pool().query(
    `insert into app_state (id, superadmin) values (1, $1::jsonb)
     on conflict (id) do update set superadmin = excluded.superadmin`,
    [JSON.stringify(state)],
  );
}

export async function appendAudit(row: { actor: string; action: string; target: string; detail: string; ip: string }): Promise<void> {
  await pool().query(
    `insert into audit_logs (actor, action, target, detail, ip) values ($1,$2,$3,$4,$5)`,
    [row.actor, row.action, row.target, row.detail, row.ip],
  );
}

export async function queryAudit(limit: number, before: string, q: string, kind: string): Promise<{ id: string; at: string; actor: string; action: string; target: string; detail: string; ip: string }[]> {
  const result = await pool().query(
    `select id::text as id, at, actor, action, target, detail, ip
     from audit_logs
     where ($1::bigint is null or id < $1::bigint)
       and ($2::text = '' or position(lower($2) in lower(actor || ' ' || action || ' ' || target || ' ' || detail || ' ' || ip)) > 0)
       and (
         $4::text = 'all'
         or ($4 = 'pages' and action = 'page.viewed')
         or ($4 = 'signin' and action ~ '(login|signin|signout|password|code_sent|account)')
         or ($4 = 'shop' and action ~ '^(order|product|contact|profile)\\.')
         or ($4 = 'notable' and action <> 'page.viewed')
       )
     order by id desc
     limit $3`,
    [before || null, q, limit, kind || 'all'],
  );
  return result.rows.map(row => ({
    id: String(row.id),
    at: iso(row.at),
    actor: String(row.actor || ''),
    action: String(row.action || ''),
    target: String(row.target || ''),
    detail: String(row.detail || ''),
    ip: String(row.ip || ''),
  }));
}

export async function countAudit(): Promise<number> {
  const result = await pool().query('select count(*)::int as n from audit_logs');
  return num(result.rows[0]?.n);
}
