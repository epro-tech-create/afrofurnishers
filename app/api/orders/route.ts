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
  const mine = db.orders.filter(o => o.customerId === customer.id || (key.length >= 9 && phoneKey(o.customer.phone) === key));
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
  const submittedName = String(customer.name || '').trim();
  const submittedPhone = String(customer.phone || '').trim();
  const name = admin ? submittedName : (account!.name || submittedName);
  const phone = admin ? submittedPhone : (digits(submittedPhone).length >= 9 ? submittedPhone : account!.phone);

  if (!itemsIn.length) return NextResponse.json({ error: 'Your bag is empty' }, { status: 400 });
  if (itemsIn.length > 30) return NextResponse.json({ error: 'Too many pieces in one order' }, { status: 400 });
  if (admin && name.length < 2) return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
  if (digits(phone).length < 9) return NextResponse.json({ error: 'A valid phone number is required so we can call about delivery.' }, { status: 400 });
  if (digits(phone).length > 15) return NextResponse.json({ error: 'Phone number is too long' }, { status: 400 });
  const address = String(customer.address || '').trim().slice(0, 200);
  if (!address) return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 });

  const db = await readDB();
  const items: OrderItem[] = [];
  for (const line of itemsIn) {
    const p = db.products.find(p => p.id === String(line.productId) && p.active);
    if (!p) return NextResponse.json({ error: `Product no longer available: ${line.productId}` }, { status: 400 });
    const qty = Math.floor(Number(line.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    if (p.stock < qty) return NextResponse.json({ error: `Only ${p.stock} left of ${p.name}` }, { status: 400 });
    items.push({ productId: p.id, name: p.name, price: p.price, qty, image: p.image });
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const area = String(customer.area || 'Kinondoni').trim().slice(0, 40);
  const payment = body.payment === 'shop' ? 'shop' : 'cod';
  const deliveryFee = payment === 'shop' ? 0 : deliveryFeeFor(area);
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
      name: name.slice(0, 80),
      phone: phone.slice(0, 20),
      address,
      area,
      notes: customer.notes ? String(customer.notes).slice(0, 500) : undefined,
    },
    payment,
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
