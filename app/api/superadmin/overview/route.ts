import { NextResponse } from 'next/server';
import { isSuperadminRequest } from '@/lib/superadmin-auth';
import { buildSuperadminReport } from '@/lib/superadmin-report';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await isSuperadminRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await buildSuperadminReport());
}
