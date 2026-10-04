import { NextResponse } from 'next/server';
import { listAudit } from '@/lib/audit';
import { isSuperadminRequest } from '@/lib/superadmin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await isSuperadminRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const rows = await listAudit({
    limit: Number(url.searchParams.get('limit') || 50),
    before: url.searchParams.get('before') || '',
    q: url.searchParams.get('q') || '',
    kind: url.searchParams.get('kind') || 'all',
  });
  return NextResponse.json({ rows });
}
