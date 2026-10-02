import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { listCustomers, saveCustomer } from '@/lib/customer-directory';

export async function GET(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const customers = await listCustomers();
  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const saved = await saveCustomer(body);
  if ('error' in saved) return NextResponse.json({ error: saved.error }, { status: saved.status });
  return NextResponse.json({ ok: true });
}
