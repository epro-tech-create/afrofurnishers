import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { clientIp, isAdminRequest } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { saveProductPhoto } from '@/lib/save-product-photo';

export async function GET(req: Request) {
  const db = await readDB();
  const url = new URL(req.url);
  const admin = await isAdminRequest(req);
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const category = url.searchParams.get('category') || 'All';
  const all = url.searchParams.get('all') === '1';

  let items = db.products;
  if (!admin && !all) items = items.filter(p => p.active);
  if (!admin && all) items = items.filter(p => p.active);
  if (category !== 'All') items = items.filter(p => p.category === category);
  if (q) items = items.filter(p => `${p.name} ${p.category} ${p.color} ${p.material}`.toLowerCase().includes(q));

  return NextResponse.json({ products: items });
}

export async function POST(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const price = Number(body?.price);
  if (!body?.name || !Number.isFinite(price) || price < 0 || price > 1e12) {
    return NextResponse.json({ error: 'Name and numeric price are required' }, { status: 400 });
  }
  const db = await readDB();
  const idBase = String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || `product-${Date.now()}`;
  const requested = typeof body.id === 'string' ? body.id.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) : '';
  let id = requested || idBase;
  if (db.products.some(p => p.id === id)) id = `${idBase}-${Date.now().toString(36)}`;
  const t = new Date().toISOString();
  let image = 'hero';
  try {
    image = await saveProductPhoto(id, body.image);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not save that photo' }, { status: 400 });
  }
  const product = {
    id,
    name: String(body.name).slice(0, 120),
    category: String(body.category || 'Living Room').slice(0, 40),
    price: Math.max(0, Math.round(price)),
    oldPrice: typeof body.oldPrice === 'number' && Number.isFinite(body.oldPrice) ? Math.round(body.oldPrice) : undefined,
    image,
    material: String(body.material || '').slice(0, 80),
    dimensions: String(body.dimensions || '').slice(0, 80),
    color: String(body.color || '').slice(0, 40),
    stock: Math.max(0, Math.min(100000, Math.floor(Number(body.stock ?? 0)) || 0)),
    description: String(body.description || '').slice(0, 2000),
    featured: Boolean(body.featured),
    active: body.active !== false,
    createdAt: t,
    updatedAt: t,
  };
  db.products.unshift(product);
  await writeDB(db);
  await recordAudit({ actor: 'workshop', action: 'product.created', target: product.id, detail: product.name, ip: clientIp(req) });
  return NextResponse.json({ product }, { status: 201 });
}
