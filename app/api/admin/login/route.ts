import { NextResponse } from 'next/server';
import {
  adminCookieHeader,
  clearAdminCookieHeader,
  clientIp,
  deviceFrom,
  isAdminRequest,
  isPasswordSetViaEnv,
  issueAdminSession,
  loginBlocked,
  revokeAdminSession,
  recordLoginAttempt,
  hashPassword,
  verifyPassword,
} from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { readDB, writeDB } from '@/lib/db';

export async function GET(req: Request) {
  return NextResponse.json({ authenticated: await isAdminRequest(req) });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (loginBlocked(ip)) {
    return NextResponse.json({ error: 'Too many attempts — try again in 10 minutes' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const password = String(body?.password || '');
  const ok = password.length > 0 && (await verifyPassword(password));
  recordLoginAttempt(ip, ok);
  if (!ok) {
    await recordAudit({ actor: 'workshop', action: 'login.failed', ip, detail: `Wrong password · ${deviceFrom(req)}` });
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  await recordAudit({ actor: 'workshop', action: 'login', ip, detail: deviceFrom(req) });
  const token = await issueAdminSession();
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', adminCookieHeader(token));
  return res;
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (await isPasswordSetViaEnv()) {
    return NextResponse.json({ error: 'Password is set via ADMIN_PASSWORD — change it on the server, not here' }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const current = String(body?.current || '');
  const next = String(body?.next || '');
  if (next.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  if (!(await verifyPassword(current))) return NextResponse.json({ error: 'Current password is wrong' }, { status: 401 });
  const db = await readDB();
  db.admin = {
    passwordHash: hashPassword(next),
    updatedAt: new Date().toISOString(),
    profile: db.admin?.profile,
    sessions: [],
  };
  await writeDB(db);
  await recordAudit({ actor: 'workshop', action: 'password.changed', ip: clientIp(req) });
  const token = await issueAdminSession();
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', adminCookieHeader(token));
  return res;
}

export async function DELETE(req: Request) {
  if (await isAdminRequest(req)) await recordAudit({ actor: 'workshop', action: 'logout', ip: clientIp(req), detail: deviceFrom(req) });
  await revokeAdminSession(req);
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearAdminCookieHeader());
  return res;
}
