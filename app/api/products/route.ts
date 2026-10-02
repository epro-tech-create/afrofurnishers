import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

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
  if (!body?.name || typeof body.price !== 'number') {
    return NextResponse.json({ error: 'Name and numeric price are required' }, { status: 400 });
  }
  const db = await readDB();
  const idBase = String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || `product-${Date.now()}`;
  let id = body.id && typeof body.id === 'string' ? body.id : idBase;
  if (db.products.some(p => p.id === id)) id = `${idBase}-${Date.now().toString(36)}`;
  const t = new Date().toISOString();
  const product = {
    id,
    name: String(body.name),
    category: String(body.category || 'Living Room'),
    price: Math.max(0, Math.round(body.price)),
    oldPrice: typeof body.oldPrice === 'number' ? body.oldPrice : undefined,
    image: String(body.image || 'hero'),
    material: String(body.material || ''),
    dimensions: String(body.dimensions || ''),
    color: String(body.color || ''),
    stock: Math.max(0, Math.floor(Number(body.stock ?? 0))),
    description: String(body.description || ''),
    featured: Boolean(body.featured),
    active: body.active !== false,
    createdAt: t,
    updatedAt: t,
  };
  db.products.unshift(product);
  await writeDB(db);
  return NextResponse.json({ product }, { status: 201 });
}
