import { clientIp, deviceFrom } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { auth } from '@/lib/auth/server';

const handlers = auth.handler();

function authEvent(pathname: string, method: string): { action: string; detail: string } | null {
  const path = pathname.toLowerCase();
  if (method === 'POST' && path.includes('sign-in/social')) return { action: 'customer.signin', detail: 'Google' };
  if (method === 'GET' && path.includes('callback')) return { action: 'customer.signin', detail: 'Google' };
  if (method === 'POST' && path.includes('send-verification-otp')) return { action: 'customer.code_sent', detail: 'Email code requested' };
  if (method === 'POST' && path.includes('sign-in/email-otp')) return { action: 'customer.signin', detail: 'Email code' };
  if (method === 'POST' && path.includes('sign-out')) return { action: 'customer.signout', detail: 'Signed out' };
  return null;
}

function wrap(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') {
  const run = handlers[method] as (req: Request, context?: unknown) => Promise<Response>;
  return async (req: Request, context?: unknown) => {
    const res = await run(req, context);
    const event = authEvent(new URL(req.url).pathname, method);
    if (!event) return res;
    const failed = !res.ok && (method === 'POST');
    if (!res.ok && !failed) return res;
    await recordAudit({
      actor: 'customer',
      action: failed ? 'customer.signin_failed' : event.action,
      detail: `${event.detail} · ${deviceFrom(req)}`,
      ip: clientIp(req),
    });
    return res;
  };
}

export const GET = wrap('GET');
export const POST = wrap('POST');
export const PUT = wrap('PUT');
export const PATCH = wrap('PATCH');
export const DELETE = wrap('DELETE');

export const dynamic = 'force-dynamic';
