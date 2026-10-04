import { NextResponse } from 'next/server';
import { clientIp, deviceFrom, tooMany } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import {
  clearCustomerCookieHeader,
  createCustomer,
  customerCookieHeader,
  customerLoginBlocked,
  disguiseMissingAccount,
  findCustomerByPhone,
  getCustomer,
  phoneKey,
  recordCustomerLogin,
  toPublicCustomer,
  verifyCustomerPassword,
} from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

const digits = (s: string) => (s || '').replace(/\D/g, '');

export async function GET(req: Request) {
  const customer = await getCustomer(req);
  return NextResponse.json({ customer });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (customerLoginBlocked(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const action = body.action === 'signup' ? 'signup' : body.action === 'login' ? 'login' : '';
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();

  if (!action) return NextResponse.json({ error: 'Choose sign in or create account' }, { status: 400 });
  if (phoneKey(phone).length < 9) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  if (password.length > 72) return NextResponse.json({ error: 'Password is too long.' }, { status: 400 });

  if (action === 'signup') {
    if (tooMany(`signup:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many new accounts from here. Try again later.' }, { status: 429 });
    }
    if (name.length < 2) return NextResponse.json({ error: 'Enter your full name.' }, { status: 400 });
    if (name.length > 80) return NextResponse.json({ error: 'Name is too long.' }, { status: 400 });
    if (digits(phone).length < 9) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
    try {
      const customer = await createCustomer({ name, phone, password });
      await recordAudit({ actor: 'customer', action: 'account.signup', target: customer.name, detail: deviceFrom(req), ip });
      const res = NextResponse.json({ customer });
      res.headers.set('Set-Cookie', await customerCookieHeader(customer.id));
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create account';
      return NextResponse.json({ error: message }, { status: 409 });
    }
  }

  const account = await findCustomerByPhone(phone);
  if (!account) disguiseMissingAccount(password);
  const ok = Boolean(account && verifyCustomerPassword(password, account.passwordHash));
  recordCustomerLogin(ip, ok);
  if (!account || !ok) {
    await recordAudit({ actor: 'customer', action: 'login.failed', detail: `Phone sign-in · ${deviceFrom(req)}`, ip });
    return NextResponse.json({ error: 'Phone or password is incorrect.' }, { status: 401 });
  }
  await recordAudit({ actor: 'customer', action: 'account.login', target: account.name, detail: deviceFrom(req), ip });
  const customer = toPublicCustomer(account);
  const res = NextResponse.json({ customer });
  res.headers.set('Set-Cookie', await customerCookieHeader(customer.id));
  return res;
}

export async function DELETE(req: Request) {
  const customer = await getCustomer(req);
  if (customer) await recordAudit({ actor: 'customer', action: 'account.logout', target: customer.name, detail: deviceFrom(req), ip: clientIp(req) });
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearCustomerCookieHeader());
  return res;
}
