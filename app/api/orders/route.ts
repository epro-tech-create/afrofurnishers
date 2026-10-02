import { NextResponse } from 'next/server';
import { nextOrderId, readDB, writeDB } from '@/lib/db';
import { deliveryFeeFor, type Order, type OrderItem } from '@/lib/shop-types';
import { isAdminRequest } from '@/lib/admin-auth';
import { findCustomerByPhone, getCustomer, phoneKey } from '@/lib/customer-auth';

const digits = (s: string) => s.replace(/\D/g, '');

export async function GET(req: Request) {
  const db = await readDB();
  const url = new URL(req.url);
  if (await isAdminRequest(req)) {
    const status = url.searchParams.get('status');
    const items = status && status !== 'all'
      ? db.orders.filter(o => o.status === status)
      : db.orders;
    return NextResponse.json({ orders: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  }
  const customer = await getCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Sign in to see your orders' }, { status: 401 });
  const key = phoneKey(customer.phone);
  const mine = db.orders.filter(o => o.customerId === customer.id || phoneKey(o.customer.phone) === key);
  return NextResponse.json({ orders: mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
}

export async function POST(req: Request) {
  const admin = await isAdminRequest(req);
  const account = admin ? null : await getCustomer(req);
  if (!admin && !account) return NextResponse.json({ error: 'Create an account or sign in before checking out.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid order' }, { status: 400 });

  const itemsIn = Array.isArray(body.items) ? body.items : [];
  const customer = body.customer || {};
  const name = admin ? String(customer.name || '').trim() : account!.name;
  const phone = admin ? String(customer.phone || '').trim() : account!.phone;

  if (!itemsIn.length) return NextResponse.json({ error: 'Your bag is empty' }, { status: 400 });
  if (admin && name.length < 2) return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
  if (admin && digits(phone).length < 9) return NextResponse.json({ error: 'A valid customer phone is required' }, { status: 400 });
  if (!String(customer.address || '').trim()) return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 });

  const db = await readDB();
  const items: OrderItem[] = [];
  for (const line of itemsIn) {
    const p = db.products.find(p => p.id === String(line.productId) && p.active);
    if (!p) return NextResponse.json({ error: `Product no longer available: ${line.productId}` }, { status: 400 });
    const qty = Math.floor(Number(line.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    if (p.stock < qty) return NextResponse.json({ error: `Only ${p.stock} left in stock: ${p.name}` }, { status: 400 });
    items.push({ productId: p.id, name: p.name, price: p.price, qty, image: p.image });
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const area = String(customer.area || 'Kinondoni');
  const deliveryFee = deliveryFeeFor(area);
  const total = subtotal + deliveryFee;
  const t = new Date().toISOString();

  const linked = admin ? await findCustomerByPhone(phone) : null;
  const payStatus = admin && body.paymentStatus === 'paid' ? 'paid' : 'unpaid';
  const status = admin && ['pending', 'confirmed', 'preparing', 'delivering', 'delivered'].includes(body.status)
    ? body.status
    : 'pending';

  const order: Order = {
    id: nextOrderId(db.orders),
    customerId: admin ? linked?.id : account!.id,
    items,
    customer: {
      name,
      phone,
      address: String(customer.address).trim(),
      area,
      notes: customer.notes ? String(customer.notes).slice(0, 500) : undefined,
    },
    payment: 'cod',
    subtotal,
    deliveryFee,
    total,
    status,
    paymentStatus: payStatus,
    source: admin ? 'admin' : 'website',
    createdAt: t,
    updatedAt: t,
  };

  // Decrement stock
  for (const item of items) {
    const p = db.products.find(p => p.id === item.productId);
    if (p) {
      p.stock = Math.max(0, p.stock - item.qty);
      p.updatedAt = t;
    }
  }
  db.orders.unshift(order);
  await writeDB(db);
  return NextResponse.json({ order }, { status: 201 });
}
