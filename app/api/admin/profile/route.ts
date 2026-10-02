import { NextResponse } from 'next/server';
import { isAdminRequest, isPasswordSetViaEnv } from '@/lib/admin-auth';
import { readDB, writeDB } from '@/lib/db';
import type { AdminProfile } from '@/lib/shop-types';

const EMPTY: AdminProfile = { name: '', phone: '', role: 'Admin', email: '', photo: '' };

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await readDB();
  return NextResponse.json({
    profile: { ...EMPTY, ...db.admin?.profile },
    passwordFromServer: await isPasswordSetViaEnv(),
  });
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const name = String(body.name || '').trim().slice(0, 80);
  const phone = String(body.phone || '').trim().slice(0, 20);
  const role = String(body.role || '').trim().slice(0, 40);
  const email = String(body.email || '').trim().slice(0, 80);
  const photo = String(body.photo || '');
  if (name.length < 2) return NextResponse.json({ error: 'Enter your name.' }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  }
  if (photo && (!photo.startsWith('data:image/') || photo.length > 180000)) {
    return NextResponse.json({ error: 'Choose a smaller photo.' }, { status: 400 });
  }

  const profile: AdminProfile = { name, phone, role: role || 'Admin', email, photo };
  const db = await readDB();
  db.admin = {
    passwordHash: db.admin?.passwordHash || '',
    updatedAt: db.admin?.updatedAt || new Date().toISOString(),
    profile,
    sessions: db.admin?.sessions,
  };
  await writeDB(db);
  return NextResponse.json({ profile });
}
