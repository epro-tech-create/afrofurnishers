import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

export async function GET(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await readDB();
  const map = new Map<string, { name: string; phone: string; area: string; orders: number; spent: number; lastOrder: string }>();
  for (const o of db.orders) {
    const key = o.customer.phone.replace(/\D/g, '');
    const cur = map.get(key) ?? { name: o.customer.name, phone: o.customer.phone, area: o.customer.area, orders: 0, spent: 0, lastOrder: o.createdAt };
    cur.orders += 1;
    if (o.status !== 'cancelled') cur.spent += o.total;
    if (o.createdAt > cur.lastOrder) {
      cur.lastOrder = o.createdAt;
      cur.name = o.customer.name;
      cur.area = o.customer.area;
    }
    map.set(key, cur);
  }
  const customers = [...map.values()].sort((a, b) => b.spent - a.spent);
  return NextResponse.json({ customers });
}
