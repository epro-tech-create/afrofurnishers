import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { ORDER_STATUSES, type OrderStatus, type PaymentStatus } from '@/lib/shop-types';
import { isAdminRequest } from '@/lib/admin-auth';
import { getCustomer, phoneKey } from '@/lib/customer-auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDB();
  const order = db.orders.find(o => o.id.toLowerCase() === id.toLowerCase());
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (await isAdminRequest(req)) return NextResponse.json({ order });
  const customer = await getCustomer(req);
  const owns = Boolean(
    customer && (order.customerId === customer.id || phoneKey(order.customer.phone) === phoneKey(customer.phone)),
  );
  if (owns) return NextResponse.json({ order });
  return NextResponse.json({ error: 'Sign in with the account that placed this order.' }, { status: 401 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const db = await readDB();
  const i = db.orders.findIndex(o => o.id.toLowerCase() === id.toLowerCase());
  if (i < 0) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const order = { ...db.orders[i] };
  if (body.status && ORDER_STATUSES.includes(body.status as OrderStatus)) {
    const prev = order.status;
    order.status = body.status;
    // Restore stock on cancel, deduct again is handled at creation only.
    if (body.status === 'cancelled' && prev !== 'cancelled') {
      for (const item of order.items) {
        const p = db.products.find(p => p.id === item.productId);
        if (p) p.stock += item.qty;
      }
    }
    if (body.status === 'delivered' && order.payment === 'cod') order.paymentStatus = 'paid';
  }
  if (body.paymentStatus && ['unpaid', 'pending-mpesa', 'paid'].includes(body.paymentStatus as PaymentStatus)) {
    order.paymentStatus = body.paymentStatus;
  }
  order.updatedAt = new Date().toISOString();
  db.orders[i] = order;
  await writeDB(db);
  return NextResponse.json({ order });
}
