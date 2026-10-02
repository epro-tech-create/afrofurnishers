import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { removeCustomer, saveCustomer } from '@/lib/customer-directory';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const saved = await saveCustomer({ ...body, id: decodeURIComponent(id) });
  if ('error' in saved) return NextResponse.json({ error: saved.error }, { status: saved.status });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const removed = await removeCustomer(decodeURIComponent(id));
  if ('error' in removed) return NextResponse.json({ error: removed.error }, { status: removed.status });
  return NextResponse.json({ ok: true });
}
