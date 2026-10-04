'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { AuditRow } from '@/lib/audit';
import type { SuperadminReport } from '@/lib/superadmin-report';

type Tab = 'overview' | 'orders' | 'catalogue' | 'people' | 'visits' | 'audit';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Orders' },
  { id: 'catalogue', label: 'Catalogue' },
  { id: 'people', label: 'People' },
  { id: 'visits', label: 'Visits' },
  { id: 'audit', label: 'Audit log' },
];

function money(value: number) {
  return `TZS ${new Intl.NumberFormat('en-TZ').format(value)}`;
}

function when(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam', hour12: false });
}

export function SuperadminApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [report, setReport] = useState<SuperadminReport | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditQ, setAuditQ] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [currentPw, setCurrentPw] = useState('');
  const [nextPw, setNextPw] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    const res = await fetch('/api/superadmin/overview', { cache: 'no-store' });
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    if (!res.ok) throw new Error('Could not load the portal');
    const data = await res.json() as SuperadminReport;
    setReport(data);
    setAudit(data.audit);
  }

  useEffect(() => {
    let live = true;
    fetch('/api/superadmin/login', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (live) setAuthed(Boolean(data.authenticated)); })
      .catch(() => { if (live) setAuthed(false); })
      .finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!authed) return;
    let live = true;
    refresh().catch(() => { if (live) setError('Could not load the portal'); });
    const timer = setInterval(() => { refresh().catch(() => {}); }, 20000);
    return () => { live = false; clearInterval(timer); };
  }, [authed]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not sign in');
      setPassword('');
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch('/api/superadmin/login', { method: 'DELETE' });
    setAuthed(false);
    setReport(null);
  }

  async function loadAudit(before = '') {
    const params = new URLSearchParams({ limit: '50', q: auditQ });
    if (before) params.set('before', before);
    const res = await fetch(`/api/superadmin/audit?${params}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json() as { rows: AuditRow[] };
    setAudit(prev => before ? [...prev, ...data.rows] : data.rows);
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setNotice('');
    setError('');
    const res = await fetch('/api/superadmin/login', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ current: currentPw, next: nextPw }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not change the password');
      return;
    }
    setCurrentPw('');
    setNextPw('');
    setNotice('Password updated.');
  }

  const orders = useMemo(() => {
    if (!report) return [];
    if (orderStatus === 'all') return report.orders;
    return report.orders.filter(order => order.status === orderStatus);
  }, [report, orderStatus]);

  if (!ready) {
    return <div className="super-app"><div className="login-wrap"><p>Checking access</p></div></div>;
  }

  if (!authed) {
    return (
      <div className="super-app">
        <div className="login-wrap">
          <form className="login-card" onSubmit={signIn}>
            <p className="brand">AfroFurnishers</p>
            <h1>Super admin</h1>
            <p className="muted">Monitor orders, stock, visits, and the audit log. This is separate from the workshop login.</p>
            <label>
              Password
              <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Checking' : 'Enter'}</button>
          </form>
        </div>
      </div>
    );
  }

  const maxBar = Math.max(1, ...(report?.revenueByDay.map(day => day.revenue) || [1]));

  return (
    <div className="super-app">
      <div className="shell">
        <aside className="side">
          <div>
            <p className="brand">AfroFurnishers</p>
            <p className="muted" style={{ color: '#fff' }}>Super admin</p>
          </div>
          <nav>
            {TABS.map(item => (
              <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>
            ))}
          </nav>
          <button className="btn signout" type="button" onClick={signOut}>Sign out</button>
        </aside>
        <main className="main">
          <div className="top">
            <div>
              <h1>{TABS.find(item => item.id === tab)?.label}</h1>
              <p className="muted">{report ? `Updated ${when(report.generatedAt)} · Dar es Salaam` : 'Loading'}</p>
            </div>
            <button className="btn btn-ghost" type="button" onClick={() => refresh().catch(() => setError('Could not refresh'))}>Refresh</button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          {!report && <p className="muted">Loading the shop.</p>}

          {report && tab === 'overview' && (
            <>
              <div className="health">
                <span className={report.health.database ? 'on' : ''}>Database {report.health.database ? 'connected' : 'file fallback'}</span>
                <span className={report.health.neonAuth ? 'on' : ''}>Customer auth {report.health.neonAuth ? 'on' : 'off'}</span>
                <span>Workshop password {report.health.workshopPasswordFromEnv ? 'from server' : 'in database'}</span>
                <span>{report.counts.audit} audit events</span>
              </div>
              <section className="stats">
                <article className="stat"><span>Booked</span><strong>{money(report.money.booked)}</strong></article>
                <article className="stat"><span>Collected</span><strong>{money(report.money.collected)}</strong></article>
                <article className="stat"><span>To collect</span><strong>{money(report.money.toCollect)}</strong></article>
                <article className="stat"><span>Today</span><strong>{money(report.money.today)}</strong></article>
                <article className="stat"><span>Orders</span><strong>{report.counts.orders}</strong></article>
                <article className="stat"><span>In progress</span><strong>{report.counts.pending}</strong></article>
                <article className="stat"><span>Visits today</span><strong>{report.counts.visitsToday}</strong></article>
                <article className="stat"><span>Low stock</span><strong>{report.counts.lowStock}</strong></article>
              </section>
              <div className="grid-2">
                <section className="panel">
                  <h2>14 day bookings</h2>
                  <div className="bars">
                    {report.revenueByDay.map(day => (
                      <div key={day.date} title={`${day.date}: ${money(day.revenue)}`}>
                        <i style={{ height: `${Math.max(6, (day.revenue / maxBar) * 100)}%` }} />
                        <small>{day.date.slice(8)}</small>
                      </div>
                    ))}
                  </div>
                  <p className="muted">Average order {money(report.money.average)} · stock on hand {money(report.money.stockValue)}</p>
                </section>
                <section className="panel">
                  <h2>Order status</h2>
                  <table>
                    <tbody>
                      {Object.entries(report.ordersByStatus).map(([status, count]) => (
                        <tr key={status}><td>{status}</td><td>{count}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="muted">Website {report.sources.website} · workshop {report.sources.admin} · WhatsApp {report.sources.whatsapp}</p>
                </section>
              </div>
              <div className="grid-2">
                <section className="panel">
                  <h2>Latest audit</h2>
                  <AuditTable rows={report.audit} />
                </section>
                <section className="panel">
                  <h2>Low stock</h2>
                  {report.lowStock.length === 0 && <p className="muted">Nothing at 5 or below.</p>}
                  <table>
                    <tbody>
                      {report.lowStock.map(item => (
                        <tr key={item.id}><td>{item.name}</td><td>{item.stock}</td><td>{item.active ? 'Live' : 'Hidden'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
              <section className="panel">
                <h2>Change password</h2>
                {report.health.superadminPasswordFromEnv ? (
                  <p className="muted">This password is set on the server as SUPERADMIN_PASSWORD.</p>
                ) : (
                  <form className="password-row" onSubmit={changePassword}>
                    <label>Current<input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" required /></label>
                    <label>New<input type="password" value={nextPw} onChange={e => setNextPw(e.target.value)} autoComplete="new-password" minLength={10} required /></label>
                    <button className="btn btn-primary" type="submit">Save</button>
                  </form>
                )}
                {notice && <p className="muted">{notice}</p>}
              </section>
            </>
          )}

          {report && tab === 'orders' && (
            <section className="panel">
              <div className="filters">
                <select value={orderStatus} onChange={e => setOrderStatus(e.target.value)} aria-label="Order status">
                  {['all', 'pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'].map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="scroll">
                <table>
                  <thead><tr><th>When</th><th>Order</th><th>Customer</th><th>Area</th><th>Total</th><th>Status</th><th>Pay</th><th>Source</th></tr></thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td>{when(order.createdAt)}</td>
                        <td>{order.id}</td>
                        <td>{order.name}<br /><span className="muted">{order.phone}</span></td>
                        <td>{order.area}</td>
                        <td>{money(order.total)}</td>
                        <td><span className="pill">{order.status}</span></td>
                        <td>{order.paymentStatus} · {order.payment}</td>
                        <td>{order.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {orders.length === 0 && <p className="muted">No orders in this view.</p>}
            </section>
          )}

          {report && tab === 'catalogue' && (
            <section className="panel">
              <p className="muted">{report.counts.activeProducts} live of {report.counts.products}</p>
              <div className="scroll">
                <table>
                  <thead><tr><th>Piece</th><th>Category</th><th>Price</th><th>Stock</th><th>State</th></tr></thead>
                  <tbody>
                    {report.products.map(product => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.category}</td>
                        <td>{money(product.price)}</td>
                        <td>{product.stock}</td>
                        <td>{product.active ? 'Live' : 'Hidden'}{product.featured ? ' · featured' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {report && tab === 'people' && (
            <div className="grid-2">
              <section className="panel">
                <h2>Accounts</h2>
                <p className="muted">{report.counts.accounts} saved accounts · {report.counts.customers} phones on orders</p>
                <table>
                  <tbody>
                    {report.accounts.map(account => (
                      <tr key={account.id}><td>{account.name}</td><td>{account.phone || 'No phone'}</td><td>{when(account.createdAt)}</td></tr>
                    ))}
                  </tbody>
                </table>
                {report.accounts.length === 0 && <p className="muted">No phone accounts stored. Google and email sign-ins stay in Neon Auth.</p>}
              </section>
              <section className="panel">
                <h2>Workshop contacts</h2>
                <table>
                  <tbody>
                    {report.contacts.map(contact => (
                      <tr key={contact.id}><td>{contact.name}</td><td>{contact.phone}</td><td>{contact.area}</td></tr>
                    ))}
                  </tbody>
                </table>
                {report.contacts.length === 0 && <p className="muted">No workshop contacts yet.</p>}
              </section>
            </div>
          )}

          {report && tab === 'visits' && (
            <div className="grid-2">
              <section className="panel">
                <h2>Traffic</h2>
                <p className="muted">{report.counts.visits} views · {report.counts.visitsToday} today · {report.counts.unique7d} people in 7 days</p>
                <table>
                  <tbody>
                    {report.topPages.map(page => (
                      <tr key={page.path}><td>{page.path}</td><td>{page.views}</td></tr>
                    ))}
                  </tbody>
                </table>
                {report.topPages.length === 0 && <p className="muted">No visits recorded yet.</p>}
              </section>
              <section className="panel">
                <h2>Recent pages</h2>
                <table>
                  <tbody>
                    {report.visits.map((visit, index) => (
                      <tr key={`${visit.at}-${index}`}><td>{when(visit.at)}</td><td>{visit.path}</td><td className="muted">{visit.referrer || visit.visitor}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {report && tab === 'audit' && (
            <section className="panel">
              <form className="filters" onSubmit={event => { event.preventDefault(); loadAudit(); }}>
                <input value={auditQ} onChange={e => setAuditQ(e.target.value)} placeholder="Search actor, action, order" aria-label="Search audit log" />
                <button className="btn btn-primary" type="submit">Search</button>
              </form>
              <AuditTable rows={audit} />
              {audit.length > 0 && (
                <button className="btn btn-ghost" type="button" onClick={() => loadAudit(audit[audit.length - 1].id)}>Older</button>
              )}
              {audit.length === 0 && <p className="muted">No audit events yet. Sign-ins, orders, products, and customer changes show up here.</p>}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function AuditTable({ rows }: { rows: AuditRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="scroll">
      <table>
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Detail</th><th>IP</th></tr></thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>{when(row.at)}</td>
              <td>{row.actor}</td>
              <td>{row.action}</td>
              <td>{row.target}</td>
              <td>{row.detail}</td>
              <td>{row.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
