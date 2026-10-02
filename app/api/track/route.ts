import { NextResponse } from 'next/server';
import { clientIp, tooMany } from '@/lib/admin-auth';
import { addVisit } from '@/lib/db';

// Public hit endpoint — called by <VisitTracker /> on every page view.
// Kept tiny and failure-proof so it never affects page rendering.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const path = String(body?.path || '').slice(0, 200);
    const visitorId = String(body?.visitorId || '').slice(0, 64);
    const referrer = body?.referrer ? String(body.referrer).slice(0, 300) : undefined;
    if (!path.startsWith('/') || path.includes('..') || !visitorId) return NextResponse.json({ ok: false }, { status: 400 });
    if (path.startsWith('/api/')) return NextResponse.json({ ok: true });
    if (tooMany(`visit:${clientIp(req)}`, 60, 60 * 1000)) return NextResponse.json({ ok: true });
    await addVisit({ visitorId, path, referrer });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Admin only — see /api/stats' }, { status: 401 });
}
