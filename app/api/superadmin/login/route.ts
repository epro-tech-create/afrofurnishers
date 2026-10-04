import { NextResponse } from 'next/server';
import { clientIp, deviceFrom } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import {
  changeSuperadminPassword,
  clearSuperadminCookieHeader,
  isSuperadminRequest,
  issueSuperadminSession,
  recordSuperadminLogin,
  revokeSuperadminSession,
  superadminCookieHeader,
  superadminLoginBlocked,
  verifySuperadminPassword,
} from '@/lib/superadmin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return NextResponse.json({ authenticated: await isSuperadminRequest(req) });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (superadminLoginBlocked(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 10 minutes.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const password = String(body?.password || '');
  const ok = password.length > 0 && (await verifySuperadminPassword(password));
  recordSuperadminLogin(ip, ok);
  if (!ok) {
    await recordAudit({ actor: 'superadmin', action: 'login.failed', ip, detail: `Wrong password · ${deviceFrom(req)}` });
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  const token = await issueSuperadminSession();
  await recordAudit({ actor: 'superadmin', action: 'login', ip, detail: deviceFrom(req) });
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', superadminCookieHeader(token));
  return res;
}

export async function PATCH(req: Request) {
  if (!(await isSuperadminRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const result = await changeSuperadminPassword(String(body?.current || ''), String(body?.next || ''));
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const token = await issueSuperadminSession();
  await recordAudit({ actor: 'superadmin', action: 'password.changed', ip: clientIp(req) });
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', superadminCookieHeader(token));
  return res;
}

export async function DELETE(req: Request) {
  if (await isSuperadminRequest(req)) {
    await recordAudit({ actor: 'superadmin', action: 'logout', ip: clientIp(req), detail: deviceFrom(req) });
  }
  await revokeSuperadminSession(req);
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearSuperadminCookieHeader());
  return res;
}
