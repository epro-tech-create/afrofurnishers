import { NextResponse } from 'next/server';
import { clientIp, isAdminRequest } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
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
  await recordAudit({ actor: 'workshop', action: 'contact.created', target: String(body.phone || ''), detail: String(body.name || ''), ip: clientIp(req) });
  return NextResponse.json({ ok: true });
}
