import { auditCount, listAudit, type AuditRow } from './audit';
import { isPasswordSetViaEnv } from './admin-auth';
import { readDB } from './db';
import { superadminPasswordFromEnv } from './superadmin-auth';
import type { OrderStatus } from './shop-types';

export type SuperadminReport = {
  generatedAt: string;
  health: {
    database: boolean;
    neonAuth: boolean;
    workshopPasswordFromEnv: boolean;
    superadminPasswordFromEnv: boolean;
  };
  money: {
    booked: number;
    collected: number;
    toCollect: number;
    today: number;
    average: number;
    stockValue: number;
  };
  counts: {
    orders: number;
    ordersToday: number;
    pending: number;
    customers: number;
    accounts: number;
    contacts: number;
    products: number;
    activeProducts: number;
    lowStock: number;
    visits: number;
    visitsToday: number;
    unique7d: number;
    audit: number;
  };
  ordersByStatus: Record<OrderStatus, number>;
  sources: { website: number; whatsapp: number; admin: number };
  revenueByDay: { date: string; revenue: number; orders: number }[];
  topProducts: { id: string; name: string; qty: number; revenue: number }[];
  lowStock: { id: string; name: string; stock: number; active: boolean }[];
  orders: {
    id: string;
    createdAt: string;
    name: string;
    phone: string;
    area: string;
    total: number;
    status: string;
    payment: string;
    paymentStatus: string;
    source: string;
  }[];
  products: {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    active: boolean;
    featured: boolean;
  }[];
  accounts: { id: string; name: string; phone: string; createdAt: string }[];
  contacts: { id: string; name: string; phone: string; area: string; updatedAt: string }[];
  topPages: { path: string; views: number }[];
  visits: { at: string; path: string; referrer: string; visitor: string; ip: string }[];
  audit: AuditRow[];
};

export async function buildSuperadminReport(): Promise<SuperadminReport> {
  const db = await readDB();
  const today = new Date().toISOString().slice(0, 10);
  const open = db.orders.filter(o => o.status !== 'cancelled');
  const booked = open.reduce((s, o) => s + o.total, 0);
  const collected = open.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);
  const todayOrders = open.filter(o => o.createdAt.slice(0, 10) === today);

  const ordersByStatus = { pending: 0, confirmed: 0, preparing: 0, delivering: 0, delivered: 0, cancelled: 0 } as Record<OrderStatus, number>;
  const sources = { website: 0, whatsapp: 0, admin: 0 };
  for (const order of db.orders) {
    ordersByStatus[order.status] += 1;
    sources[order.source] += 1;
  }

  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = 13; i >= 0; i--) buckets.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  for (const order of open) {
    const bucket = buckets.get(order.createdAt.slice(0, 10));
    if (bucket) {
      bucket.revenue += order.total;
      bucket.orders += 1;
    }
  }

  const sold = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const order of open) {
    for (const item of order.items) {
      const cur = sold.get(item.productId) ?? { name: item.name, qty: 0, revenue: 0 };
      cur.qty += item.qty;
      cur.revenue += item.price * item.qty;
      sold.set(item.productId, cur);
    }
  }

  const pages = new Map<string, number>();
  const week = new Set<string>();
  const weekCut = Date.now() - 7 * 86400000;
  let visitsToday = 0;
  for (const visit of db.visits) {
    if (visit.createdAt.slice(0, 10) === today) visitsToday += 1;
    pages.set(visit.path, (pages.get(visit.path) || 0) + 1);
    if (new Date(visit.createdAt).getTime() >= weekCut) week.add(visit.visitorId);
  }

  const active = db.products.filter(p => p.active);
  const [audit, auditTotal, workshopFromEnv] = await Promise.all([
    listAudit({ limit: 8, kind: 'notable' }),
    auditCount(),
    isPasswordSetViaEnv(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    health: {
      database: Boolean(process.env.DATABASE_URL),
      neonAuth: Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET),
      workshopPasswordFromEnv: workshopFromEnv,
      superadminPasswordFromEnv: superadminPasswordFromEnv(),
    },
    money: {
      booked,
      collected,
      toCollect: open.filter(o => o.paymentStatus !== 'paid').reduce((s, o) => s + o.total, 0),
      today: todayOrders.reduce((s, o) => s + o.total, 0),
      average: open.length ? Math.round(booked / open.length) : 0,
      stockValue: active.reduce((s, p) => s + p.price * p.stock, 0),
    },
    counts: {
      orders: db.orders.length,
      ordersToday: todayOrders.length,
      pending: ordersByStatus.pending + ordersByStatus.confirmed + ordersByStatus.preparing,
      customers: new Set(db.orders.map(o => o.customer.phone.replace(/\D/g, '')).filter(Boolean)).size,
      accounts: db.customers.length,
      contacts: db.contacts.length,
      products: db.products.length,
      activeProducts: active.length,
      lowStock: db.products.filter(p => p.active && p.stock <= 5).length,
      visits: db.visits.length,
      visitsToday,
      unique7d: week.size,
      audit: auditTotal,
    },
    ordersByStatus,
    sources,
    revenueByDay: [...buckets.entries()].map(([date, value]) => ({ date, revenue: value.revenue, orders: value.orders })),
    topProducts: [...sold.entries()].map(([id, value]) => ({ id, ...value })).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    lowStock: db.products.filter(p => p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 8).map(p => ({ id: p.id, name: p.name, stock: p.stock, active: p.active })),
    orders: [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200).map(o => ({
      id: o.id,
      createdAt: o.createdAt,
      name: o.customer.name,
      phone: o.customer.phone,
      area: o.customer.area,
      total: o.total,
      status: o.status,
      payment: o.payment,
      paymentStatus: o.paymentStatus,
      source: o.source,
    })),
    products: [...db.products].sort((a, b) => a.name.localeCompare(b.name)).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      active: p.active,
      featured: Boolean(p.featured),
    })),
    accounts: db.customers.map(c => ({ id: c.id, name: c.name, phone: c.phone, createdAt: c.createdAt })),
    contacts: db.contacts.map(c => ({ id: c.id, name: c.name, phone: c.phone, area: c.area, updatedAt: c.updatedAt })),
    topPages: [...pages.entries()].map(([pathName, views]) => ({ path: pathName, views })).sort((a, b) => b.views - a.views).slice(0, 8),
    visits: [...db.visits].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 400).map(v => ({
      at: v.createdAt,
      path: v.path,
      referrer: v.referrer || '',
      visitor: v.visitorId.slice(0, 8),
      ip: v.ip || '',
    })),
    audit,
  };
}
