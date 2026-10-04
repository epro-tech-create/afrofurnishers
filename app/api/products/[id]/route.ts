import { unlink } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { clientIp, isAdminRequest } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { saveProductPhoto } from '@/lib/save-product-photo';

async function removeUploadedPhoto(image: string) {
  const match = image.match(/^\/uploads\/products\/([a-z0-9-]+\.jpg)/);
  if (!match) return;
  await unlink(path.join(process.cwd(), 'public', 'uploads', 'products', match[1])).catch(() => {});
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDB();
  const p = db.products.find(p => p.id === id);
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!p.active && !await isAdminRequest(req)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ product: p });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const db = await readDB();
  const i = db.products.findIndex(p => p.id === id);
  if (i < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const allowed = ['name', 'category', 'price', 'oldPrice', 'image', 'material', 'dimensions', 'color', 'stock', 'description', 'featured', 'active'];
  const updated = { ...db.products[i] };
  for (const k of allowed) {
    if (k in body) (updated as Record<string, unknown>)[k] = body[k];
  }
  if (typeof updated.price === 'number') updated.price = Math.max(0, Math.min(1e12, Math.round(updated.price)));
  if (typeof updated.stock === 'number') updated.stock = Math.max(0, Math.min(100000, Math.floor(updated.stock)));
  updated.name = String(updated.name || '').slice(0, 120);
  updated.description = String(updated.description || '').slice(0, 2000);
  if ('image' in body) {
    try {
      updated.image = await saveProductPhoto(id, body.image, db.products[i].image || 'hero');
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not save that photo' }, { status: 400 });
    }
  }
  updated.updatedAt = new Date().toISOString();
  db.products[i] = updated;
  await writeDB(db);
  await recordAudit({ actor: 'workshop', action: 'product.updated', target: updated.id, detail: `${updated.name} · stock ${updated.stock}`, ip: clientIp(req) });
  return NextResponse.json({ product: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = await readDB();
  const i = db.products.findIndex(p => p.id === id);
  if (i < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [removed] = db.products.splice(i, 1);
  await removeUploadedPhoto(removed.image);
  await writeDB(db);
  await recordAudit({ actor: 'workshop', action: 'product.deleted', target: removed.id, detail: removed.name, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
}
