import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { appendAudit, countAudit, ensureShopSchema, queryAudit } from './neon-store';

export type AuditRow = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
};

const FILE = path.join(process.cwd(), 'data', 'audit-log.json');
const MAX_FILE = 2000;

function clip(value: string, max: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

async function readFileLog(): Promise<AuditRow[]> {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw) as AuditRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFileLog(rows: AuditRow[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(rows.slice(-MAX_FILE)), 'utf8');
}

export async function recordAudit(event: {
  actor: string;
  action: string;
  target?: string;
  detail?: string;
  ip?: string;
}): Promise<void> {
  const row = {
    actor: clip(event.actor || 'unknown', 40),
    action: clip(event.action || 'event', 80),
    target: clip(event.target || '', 120),
    detail: clip(event.detail || '', 500),
    ip: clip(event.ip || '', 64),
  };
  try {
    if (process.env.DATABASE_URL) {
      await ensureShopSchema();
      await appendAudit(row);
      return;
    }
    const rows = await readFileLog();
    rows.push({ id: randomUUID(), at: new Date().toISOString(), ...row });
    await writeFileLog(rows);
  } catch (error) {
    console.error('[audit]', error instanceof Error ? error.message : 'failed');
  }
}

export async function listAudit(options: { limit?: number; before?: string; q?: string; kind?: string }): Promise<AuditRow[]> {
  const limit = Math.max(1, Math.min(100, options.limit || 40));
  const q = clip(options.q || '', 80).toLowerCase();
  const before = options.before || '';
  const kind = options.kind || 'all';
  if (process.env.DATABASE_URL) {
    await ensureShopSchema();
    return queryAudit(limit, before, q, options.kind || 'all');
  }
  let rows = (await readFileLog()).slice().reverse();
  if (before) {
    const index = rows.findIndex(row => row.id === before);
    if (index >= 0) rows = rows.slice(index + 1);
  }
  if (q) {
    rows = rows.filter(row => `${row.actor} ${row.action} ${row.target} ${row.detail} ${row.ip}`.toLowerCase().includes(q));
  }
  if (kind === 'pages') rows = rows.filter(row => row.action === 'page.viewed');
  if (kind === 'signin') rows = rows.filter(row => /(login|signin|signout|password|code_sent|account)/.test(row.action));
  if (kind === 'shop') rows = rows.filter(row => /^(order|product|contact|profile)\./.test(row.action));
  if (kind === 'notable') rows = rows.filter(row => row.action !== 'page.viewed');
  return rows.slice(0, limit);
}

export async function auditCount(): Promise<number> {
  try {
    if (process.env.DATABASE_URL) {
      await ensureShopSchema();
      return countAudit();
    }
    return (await readFileLog()).length;
  } catch {
    return 0;
  }
}
