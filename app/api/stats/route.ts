import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import type { DashboardStats, OrderStatus, VisitorsStats } from '@/lib/shop-types';

function visitorsStats(db: Awaited<ReturnType<typeof readDB>>): VisitorsStats {
  const today = new Date().toISOString().slice(0, 10);
  const buckets = new Map<string, { views: number; uniques: Set<string> }>();
  for (let i = 13; i >= 0; i--) {
    buckets.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), { views: 0, uniques: new Set() });
  }
  const pages = new Map<string, number>();
  const week = new Set<string>();
  const weekCut = Date.now() - 7 * 86400000;
  let todayCount = 0;

  for (const v of db.visits) {
    const day = v.createdAt.slice(0, 10);
    if (day === today) todayCount += 1;
    const b = buckets.get(day);
    if (b) {
      b.views += 1;
      b.uniques.add(v.visitorId);
    }
    if (new Date(v.createdAt).getTime() >= weekCut) week.add(v.visitorId);
    pages.set(v.path, (pages.get(v.path) || 0) + 1);
  }

  return {
    total: db.visits.length,
    today: todayCount,
    unique7d: week.size,
    byDay: [...buckets.entries()].map(([date, v]) => ({ date: date.slice(5), views: v.views, unique: v.uniques.size })),
    topPages: [...pages.entries()]
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 6),
  };
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await readDB();
  const valid = db.orders.filter(o => o.status !== 'cancelled');
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = valid.filter(o => o.createdAt.slice(0, 10) === today);
  const byPhone = new Map<string, string>();
  for (const o of db.orders) byPhone.set(o.customer.phone.replace(/\D/g, ''), o.customer.name);

  const day = (iso: string) => iso.slice(0, 10);
  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    buckets.set(d, { revenue: 0, orders: 0 });
  }
  for (const o of valid) {
    const b = buckets.get(day(o.createdAt));
    if (b) {
      b.revenue += o.total;
      b.orders += 1;
    }
  }

  const ordersByStatus = { pending: 0, confirmed: 0, preparing: 0, delivering: 0, delivered: 0, cancelled: 0 } as Record<OrderStatus, number>;
  for (const o of db.orders) ordersByStatus[o.status] += 1;

  const prodAgg = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of valid) {
    for (const it of o.items) {
      const cur = prodAgg.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0 };
      cur.qty += it.qty;
      cur.revenue += it.price * it.qty;
      prodAgg.set(it.productId, cur);
    }
  }
  const topProducts = [...prodAgg.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const stats: DashboardStats = {
    revenue,
    revenueToday: todayOrders.reduce((s, o) => s + o.total, 0),
    orders: db.orders.length,
    ordersToday: todayOrders.length,
    pendingOrders: ordersByStatus.pending + ordersByStatus.confirmed,
    customers: byPhone.size,
    lowStock: db.products.filter(p => p.active && p.stock <= 5).length,
    avgOrderValue: valid.length ? Math.round(revenue / valid.length) : 0,
    revenueByDay: [...buckets.entries()].map(([date, v]) => ({ date: date.slice(5), revenue: v.revenue, orders: v.orders })),
    ordersByStatus,
    topProducts,
    recentOrders: [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    lowStockProducts: db.products
      .filter(p => p.active && p.stock <= 5)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6)
      .map(p => ({ id: p.id, name: p.name, stock: p.stock })),
    visitors: visitorsStats(db),
  };
  return NextResponse.json(stats);
}
