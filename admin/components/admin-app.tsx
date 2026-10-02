'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle, Banknote, Boxes, Download, Eye, LayoutDashboard, Lock, LogOut,
  Package, Pencil, Plus, RefreshCw, Search, ShoppingBag, Trash2,
  TrendingUp, Users, Wallet,
} from 'lucide-react';
import { api, clearToken, getToken, setToken } from '@/lib/api';
import { money, timeAgo } from '@/lib/format';
import type { CustomerRow, DashboardStats, Order, OrderStatus, ProductFull } from '@/lib/types';

type Tab = 'dashboard' | 'orders' | 'products' | 'customers' | 'visitors' | 'settings';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
  delivering: 'Delivering', delivered: 'Delivered', cancelled: 'Cancelled',
};

/* ---------------- login ---------------- */

function Login({ onOk }: { onOk: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api<{ ok: boolean; token: string }>('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setToken(data.token);
      onOk();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form onSubmit={submit} className="login-card">
        <p className="brand">Afro<span>Furnishers</span></p>
        <h1>Command centre</h1>
        <p className="muted">Restricted area. All sign-in attempts are rate-limited and logged.</p>
        <label>Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus autoComplete="current-password" placeholder="••••••••" />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <button className="btn-primary" disabled={busy || !password}>
          <Lock size={15} /> {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

/* ---------------- shared bits ---------------- */

function Card({ title, action, children, wide }: { title: string; action?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`card ${wide ? 'wide' : ''}`}>
      <header><h3>{title}</h3>{action}</header>
      {children}
    </section>
  );
}

function AreaChart({ points, format }: { points: { label: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...points.map(p => p.value));
  const W = 560;
  const H = 150;
  const step = points.length > 1 ? W / (points.length - 1) : 0;
  const coords = points.map((p, i) => [i * step, H - 12 - (p.value / max) * (H - 30)] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="chart" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e4572e" stopOpacity="0.35" />
            <stop offset="1" stopColor="#e4572e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="grid" />)}
        <path d={area} fill="url(#ag)" />
        <path d={line} className="line" />
        {coords.map(([x, y], i) => (
          <g key={i}>
            <rect x={i * step - step / 2} y="0" width={step} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
            {hover === i && <circle cx={x} cy={y} r="4.5" className="dot" />}
          </g>
        ))}
      </svg>
      <div className="chart-tip" aria-live="polite">
        {hover !== null ? `${points[hover].label} · ${format(points[hover].value)}` : `Last 14 days · peak ${format(max)}`}
      </div>
    </div>
  );
}

/* ---------------- dashboard ---------------- */

function Dashboard({ stats, goOrders }: { stats: DashboardStats; goOrders: (status: string) => void }) {
  const cards = [
    { label: 'Revenue', value: money(stats.revenue), sub: `${money(stats.revenueToday)} today`, icon: Wallet, tone: 'orange' },
    { label: 'Orders', value: String(stats.orders), sub: `${stats.ordersToday} today`, icon: ShoppingBag, tone: 'gold' },
    { label: 'Site visits', value: String(stats.visitors.total), sub: `${stats.visitors.today} today`, icon: Eye, tone: 'forest' },
    { label: 'Customers', value: String(stats.customers), sub: `${stats.visitors.unique7d} unique / 7d`, icon: Users, tone: 'plum' },
    { label: 'Needs action', value: String(stats.pendingOrders), sub: 'pending + confirmed', icon: AlertTriangle, tone: 'red' },
    { label: 'Avg order', value: money(stats.avgOrderValue), sub: `${stats.lowStock} low-stock items`, icon: TrendingUp, tone: 'blue' },
  ];
  return (
    <div className="grid">
      <div className="stat-grid">
        {cards.map(c => (
          <div key={c.label} className={`stat tone-${c.tone}`}>
            <span className="stat-icon"><c.icon size={19} /></span>
            <div><small>{c.label}</small><strong>{c.value}</strong><span className="muted">{c.sub}</span></div>
          </div>
        ))}
      </div>

      <div className="cols-2">
        <Card title="Revenue · last 14 days">
          <AreaChart points={stats.revenueByDay.map(d => ({ label: d.date, value: d.revenue }))} format={v => money(v)} />
        </Card>
        <Card title="Order pipeline" action={<button className="link" onClick={() => goOrders('all')}>All orders →</button>}>
          <div className="pipeline">
            {(Object.keys(STATUS_LABEL) as OrderStatus[]).filter(s => s !== 'cancelled').map(s => (
              <button key={s} className={`pipe pipe-${s}`} onClick={() => goOrders(s)}>
                <strong>{stats.ordersByStatus[s]}</strong><span>{STATUS_LABEL[s]}</span>
              </button>
            ))}
          </div>
          {stats.ordersByStatus.cancelled > 0 && (
            <p className="muted">+ {stats.ordersByStatus.cancelled} cancelled</p>
          )}
          <h4>Top products</h4>
          {stats.topProducts.length === 0 && <p className="muted">No sales yet.</p>}
          {stats.topProducts.map(p => (
            <p key={p.id} className="row"><span>{p.name} <em>× {p.qty}</em></span><strong>{money(p.revenue)}</strong></p>
          ))}
        </Card>
      </div>

      <div className="cols-2">
        <Card title="Visitors · last 14 days" action={<span className="muted">{stats.visitors.unique7d} unique / 7d</span>}>
          <AreaChart points={stats.visitors.byDay.map(d => ({ label: d.date, value: d.views }))} format={v => `${v} views`} />
          <h4>Top pages</h4>
          {stats.visitors.topPages.map(p => (
            <p key={p.path} className="row"><span className="mono">{p.path}</span><strong>{p.views} views</strong></p>
          ))}
        </Card>
        <Card title="Needs attention">
          <h4>Low stock (≤ 5)</h4>
          {stats.lowStockProducts.length === 0 && <p className="muted">All stocked up.</p>}
          {stats.lowStockProducts.map(p => (
            <p key={p.id} className="row warn"><span>{p.name}</span><strong>{p.stock} left</strong></p>
          ))}
          <h4>Recent orders</h4>
          {stats.recentOrders.map(o => (
            <p key={o.id} className="row">
              <span><strong>{o.id}</strong> · {o.customer.name} <em>· {timeAgo(o.createdAt)}</em></span>
              <strong>{money(o.total)}</strong>
            </p>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ---------------- orders ---------------- */

function Orders({ initialFilter, refreshKey, bump }: { initialFilter: string; refreshKey: number; bump: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState(initialFilter);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => setFilter(initialFilter), [initialFilter]);

  const load = useCallback(async () => {
    try {
      const data = await api<{ orders: Order[] }>('/orders');
      setOrders(data.orders);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const list = useMemo(() => orders.filter(o =>
    (filter === 'all' || o.status === filter) &&
    `${o.id} ${o.customer.name} ${o.customer.phone}`.toLowerCase().includes(q.toLowerCase()),
  ), [orders, filter, q]);

  async function patch(o: Order, body: object) {
    await api(`/orders/${o.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    await load();
    bump();
  }

  function csv() {
    const rows = [['id', 'date', 'customer', 'phone', 'area', 'items', 'total', 'payment', 'pay_status', 'status']];
    for (const o of list) {
      rows.push([o.id, o.createdAt, o.customer.name, o.customer.phone, o.customer.area,
        o.items.map(i => `${i.name}x${i.qty}`).join('; '), String(o.total), o.payment, o.paymentStatus, o.status]);
    }
    const blob = new Blob([rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Card wide title={`${list.length} orders`} action={<div className="toolbar">
      <div className="search"><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search id, name, phone…" aria-label="Search orders" /></div>
      <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter by status">
        <option value="all">All statuses</option>
        {(Object.keys(STATUS_LABEL) as OrderStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <button className="icon-btn" onClick={csv} aria-label="Export CSV"><Download size={15} /></button>
    </div>}>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap"><table>
        <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Pay</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {list.map(o => (
            <OrderRow key={o.id} o={o} open={open === o.id} toggle={() => setOpen(open === o.id ? null : o.id)} patch={patch} />
          ))}
        </tbody>
      </table></div>
      {!list.length && <p className="muted">No orders match.</p>}
    </Card>
  );
}

function OrderRow({ o, open, toggle, patch }: { o: Order; open: boolean; toggle: () => void; patch: (o: Order, b: object) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function run(b: object) {
    setBusy(true);
    try {
      await patch(o, b);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <tr>
        <td><strong>{o.id}</strong><br /><small className="muted">{timeAgo(o.createdAt)}</small></td>
        <td>{o.customer.name}<br /><small className="muted">{o.customer.phone} · {o.customer.area}</small></td>
        <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
        <td><strong>{money(o.total)}</strong><br /><small className="muted">Cash</small></td>
        <td><span className={`pill pay-${o.paymentStatus}`}>{o.paymentStatus}</span></td>
        <td><span className={`pill st-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
        <td><button className="link" onClick={toggle}>{open ? 'Hide' : 'Manage'}</button></td>
      </tr>
      {open && (
        <tr className="detail"><td colSpan={7}>
          <div className="order-detail">
            <div>
              {o.items.map(it => <p key={it.productId}>{it.name} × {it.qty} — <strong>{money(it.price * it.qty)}</strong></p>)}
              <p className="muted">{o.customer.address}{o.customer.notes ? ` · ${o.customer.notes}` : ''}</p>
            </div>
            <div className="order-actions">
              <label>Status
                <select value={o.status} disabled={busy} onChange={e => run({ status: e.target.value })}>
                  {(Object.keys(STATUS_LABEL) as OrderStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </label>
              <label>Payment
                <select value={o.paymentStatus} disabled={busy} onChange={e => run({ paymentStatus: e.target.value })}>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              <a className="link" href={`https://wa.me/${o.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Habari ${o.customer.name}, AfroFurnishers here about order ${o.id} (${STATUS_LABEL[o.status]}, ${money(o.total)}).`)}`} target="_blank" rel="noopener noreferrer">Message customer →</a>
            </div>
          </div>
        </td></tr>
      )}
    </>
  );
}

/* ---------------- products ---------------- */

const EMPTY: Partial<ProductFull> = { name: '', category: 'Living Room', price: 0, image: 'hero', material: '', dimensions: '', color: '', stock: 10, description: '', featured: false, active: true };

function Products({ refreshKey, bump }: { refreshKey: number; bump: () => void }) {
  const [items, setItems] = useState<ProductFull[]>([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Partial<ProductFull>>(EMPTY);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api<{ products: ProductFull[] }>('/products?all=1');
      setItems(data.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const list = useMemo(() => items.filter(p => `${p.name} ${p.category} ${p.id}`.toLowerCase().includes(q.toLowerCase())), [items, q]);

  async function save(e: FormEvent, id?: string) {
    e.preventDefault();
    if (id) {
      const data = await api<{ product: ProductFull }>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(draft) });
      setItems(items.map(p => (p.id === id ? data.product : p)));
      setEditing(null);
    } else {
      const data = await api<{ product: ProductFull }>('/products', { method: 'POST', body: JSON.stringify(draft) });
      setItems([data.product, ...items]);
      setCreating(false);
      setDraft(EMPTY);
    }
    bump();
  }

  async function hide(id: string) {
    if (!confirm('Hide this product from the shop? Past orders keep their history.')) return;
    await api(`/products/${id}`, { method: 'DELETE' });
    await load();
    bump();
  }

  async function quickStock(p: ProductFull, delta: number) {
    const data = await api<{ product: ProductFull }>(`/products/${p.id}`, { method: 'PUT', body: JSON.stringify({ stock: Math.max(0, p.stock + delta) }) });
    setItems(items.map(x => (x.id === p.id ? data.product : x)));
    bump();
  }

  const form = (d: Partial<ProductFull>, setD: (v: Partial<ProductFull>) => void, id?: string) => (
    <form onSubmit={e => save(e, id)} className="pform">
      <div className="fgrid">
        <label>Name<input value={d.name || ''} onChange={e => setD({ ...d, name: e.target.value })} required /></label>
        <label>Category<select value={d.category || 'Living Room'} onChange={e => setD({ ...d, category: e.target.value })}>
          {['Living Room', 'Dining Room', 'Bedroom', 'Office', 'Outdoor'].map(c => <option key={c}>{c}</option>)}
        </select></label>
        <label>Price (TZS)<input type="number" min={0} value={d.price ?? 0} onChange={e => setD({ ...d, price: Number(e.target.value) })} required /></label>
        <label>Old price<input type="number" min={0} value={d.oldPrice ?? ''} onChange={e => setD({ ...d, oldPrice: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
        <label>Stock<input type="number" min={0} value={d.stock ?? 0} onChange={e => setD({ ...d, stock: Number(e.target.value) })} required /></label>
        <label>Photo<select value={d.image || 'hero'} onChange={e => setD({ ...d, image: e.target.value })}>
          <option value="hero">hero</option><option value="dining">dining</option><option value="sofa">sofa</option>
        </select></label>
        <label>Material<input value={d.material || ''} onChange={e => setD({ ...d, material: e.target.value })} /></label>
        <label>Colour<input value={d.color || ''} onChange={e => setD({ ...d, color: e.target.value })} /></label>
        <label className="full">Dimensions<input value={d.dimensions || ''} onChange={e => setD({ ...d, dimensions: e.target.value })} placeholder="240 × 95 × 78 cm" /></label>
        <label className="full">Description<textarea value={d.description || ''} onChange={e => setD({ ...d, description: e.target.value })} /></label>
        <label className="check"><input type="checkbox" checked={!!d.featured} onChange={e => setD({ ...d, featured: e.target.checked })} /> Featured on homepage</label>
        <label className="check"><input type="checkbox" checked={d.active !== false} onChange={e => setD({ ...d, active: e.target.checked })} /> Visible in shop</label>
      </div>
      <button className="btn-primary sm">{id ? 'Save changes' : 'Add product'}</button>
    </form>
  );

  return (
    <Card wide title={`${list.length} products`} action={<div className="toolbar">
      <div className="search"><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products…" aria-label="Search products" /></div>
      <button className="btn-primary sm" onClick={() => { setCreating(!creating); setDraft(EMPTY); }}><Plus size={14} /> New</button>
    </div>}>
      {error && <p className="error">{error}</p>}
      {creating && form(draft, setDraft)}
      <div className="table-wrap"><table>
        <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {list.map(p => (
            <ProductRow key={p.id} p={p} editing={editing === p.id}
              onEdit={() => { setEditing(p.id); setDraft({ ...p }); }}
              onCancel={() => setEditing(null)}
              onHide={() => hide(p.id)}
              onStock={d => quickStock(p, d)}
              form={form(draft, setDraft, p.id)} />
          ))}
        </tbody>
      </table></div>
    </Card>
  );
}

function ProductRow({ p, editing, onEdit, onCancel, onHide, onStock, form }: {
  p: ProductFull; editing: boolean; onEdit: () => void; onCancel: () => void;
  onHide: () => void; onStock: (d: number) => void; form: ReactNode;
}) {
  return (
    <>
      <tr className={p.stock <= 5 ? 'warn' : ''}>
        <td><strong>{p.name}</strong><br /><small className="muted">{p.category} · {p.id}</small></td>
        <td>{money(p.price)}</td>
        <td>
          <span className="stock-ctl">
            <button className="mini" aria-label="Decrease stock" onClick={() => onStock(-1)}>−</button>
            <strong>{p.stock}</strong>
            <button className="mini" aria-label="Increase stock" onClick={() => onStock(1)}>+</button>
          </span>
        </td>
        <td>{p.active ? <span className="pill st-delivered">Live</span> : <span className="pill st-cancelled">Hidden</span>}{p.featured ? ' ★' : ''}</td>
        <td className="actions">
          <button className="icon-btn" aria-label={`Edit ${p.name}`} onClick={onEdit}><Pencil size={14} /></button>
          <button className="icon-btn danger" aria-label={`Hide ${p.name}`} onClick={onHide}><Trash2 size={14} /></button>
        </td>
      </tr>
      {editing && <tr className="detail"><td colSpan={5}>{form}<button className="link" onClick={onCancel}>Cancel</button></td></tr>}
    </>
  );
}

/* ---------------- customers / visitors / settings ---------------- */

function Customers() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  useEffect(() => {
    api<{ customers: CustomerRow[] }>('/customers').then(d => setRows(d.customers)).catch(() => {});
  }, []);
  return (
    <Card wide title={`${rows.length} customers`}>
      <div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Phone</th><th>Area</th><th>Orders</th><th>Spent</th><th>Last order</th><th></th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.phone}>
              <td><strong>{r.name}</strong></td><td>{r.phone}</td><td>{r.area}</td>
              <td>{r.orders}</td><td>{money(r.spent)}</td>
              <td className="muted">{timeAgo(r.lastOrder)}</td>
              <td><a className="link" href={`https://wa.me/${r.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </Card>
  );
}

function Visitors({ stats }: { stats: DashboardStats }) {
  const v = stats.visitors;
  const max = Math.max(1, ...v.byDay.map(d => d.views));
  return (
    <div className="grid">
      <div className="stat-grid cols-3">
        <div className="stat tone-forest"><span className="stat-icon"><Eye size={19} /></span><div><small>Total views</small><strong>{v.total}</strong><span className="muted">all time</span></div></div>
        <div className="stat tone-orange"><span className="stat-icon"><TrendingUp size={19} /></span><div><small>Today</small><strong>{v.today}</strong><span className="muted">page views</span></div></div>
        <div className="stat tone-plum"><span className="stat-icon"><Users size={19} /></span><div><small>Unique · 7 days</small><strong>{v.unique7d}</strong><span className="muted">visitors</span></div></div>
      </div>
      <div className="cols-2">
        <Card title="Daily views">
          <div className="bars">
            {v.byDay.map(d => (
              <div key={d.date} className="bar-col" title={`${d.date}: ${d.views} views, ${d.unique} unique`}>
                <div className="bar" style={{ height: `${Math.max(4, Math.round((d.views / max) * 130))}px` }} />
                <small>{d.date}</small>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Most visited pages">
          {v.topPages.length === 0 && <p className="muted">No visits recorded yet — browse the shop and check back.</p>}
          {v.topPages.map(p => (
            <p key={p.path} className="row"><span className="mono">{p.path}</span><strong>{p.views}</strong></p>
          ))}
          <p className="muted">Tracking is privacy-light: anonymous per-browser IDs, no cookies for ads, data stays on your server.</p>
        </Card>
      </div>
    </div>
  );
}

function Settings({ bump }: { bump: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function changePw(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      const data = await api<{ ok: boolean; token: string }>('/admin/login', { method: 'PATCH', body: JSON.stringify({ current, next }) });
      setToken(data.token);
      setMsg('Password changed. Use the new one next time.');
      setCurrent('');
      setNext('');
      bump();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function backup() {
    const [p, o] = await Promise.all([api('/products?all=1'), api('/orders')]);
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...p, ...o }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'afrofurnishers-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="grid">
      <Card title="Change password">
        <form onSubmit={changePw} className="stack">
          <label>Current password<input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" /></label>
          <label>New password (min 8 characters)<input type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" /></label>
          {err && <p className="error">{err}</p>}
          {msg && <p className="ok">{msg}</p>}
          <button className="btn-primary sm">Update password</button>
        </form>
        <p className="muted">Tip: for production, set <code>ADMIN_PASSWORD</code> on the shop server instead — it always takes precedence.</p>
      </Card>
      <Card title="Store & payments">
        <p className="row"><span><Banknote size={14} /> Cash on delivery</span><strong>Pay when it arrives</strong></p>
        <p className="row"><span><Wallet size={14} /> Delivery fees</span><strong>15k – 35k by area</strong></p>
        <button className="btn-ghost sm" onClick={backup}><Download size={14} /> Download backup (JSON)</button>
      </Card>
    </div>
  );
}

/* ---------------- shell ---------------- */

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'products', label: 'Products', icon: Boxes },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'visitors', label: 'Visitors', icon: Eye },
  { id: 'settings', label: 'Settings', icon: RefreshCw },
];

export function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [orderFilter, setOrderFilter] = useState('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!getToken()) {
      setAuthed(false);
      return;
    }
    api('/stats').then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    let live = true;
    api<DashboardStats>('/stats').then(s => { if (live) setStats(s); }).catch(() => {});
    return () => { live = false; };
  }, [authed, refreshKey]);

  async function logout() {
    try {
      await api('/admin/login', { method: 'DELETE' });
    } catch { /* token is local anyway */ }
    clearToken();
    setAuthed(false);
    setStats(null);
  }

  function goOrders(status: string) {
    setOrderFilter(status);
    setTab('orders');
  }

  if (authed === null) return <div className="login-wrap"><p className="muted">Loading…</p></div>;
  if (!authed) return <Login onOk={() => { setAuthed(true); bump(); }} />;

  return (
    <div className="shell">
      <aside className="side">
        <p className="brand">Afro<span>Furnishers</span><em>admin</em></p>
        <nav>
          {TABS.map(t => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              <t.icon size={17} /> {t.label}
              {t.id === 'orders' && stats && stats.pendingOrders > 0 && <span className="badge">{stats.pendingOrders}</span>}
            </button>
          ))}
        </nav>
        <button className="signout" onClick={logout}><LogOut size={16} /> Sign out</button>
      </aside>
      <main>
        <header className="top">
          <div>
            <h1>{TABS.find(t => t.id === tab)?.label}</h1>
            <p className="muted">{stats ? `Live · ${stats.orders} orders · ${stats.visitors.today} visits today` : 'Loading…'}</p>
          </div>
          <button className="icon-btn" onClick={bump} aria-label="Refresh"><RefreshCw size={16} /></button>
        </header>
        {tab === 'dashboard' && (stats ? <Dashboard stats={stats} goOrders={goOrders} /> : <p className="muted">Loading dashboard…</p>)}
        {tab === 'orders' && <Orders initialFilter={orderFilter} refreshKey={refreshKey} bump={bump} />}
        {tab === 'products' && <Products refreshKey={refreshKey} bump={bump} />}
        {tab === 'customers' && <Customers />}
        {tab === 'visitors' && (stats ? <Visitors stats={stats} /> : <p className="muted">Loading…</p>)}
        {tab === 'settings' && <Settings bump={bump} />}
      </main>
    </div>
  );
}
