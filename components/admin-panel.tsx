'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle, Banknote, Boxes, Check, Download, Eye, FileDown, LayoutDashboard, Lock, LogOut,
  MessageCircle, Package, Pencil, Plus, RefreshCw, Search, ShoppingBag, Trash2,
  TrendingUp, Users, Wallet, X,
} from 'lucide-react';
import { adminApi } from '@/lib/admin-client';
import { money } from '@/lib/catalog';
import { downloadShopReport } from '@/lib/pdf-report';
import { DELIVERY_FEES, deliveryFeeFor, type AdminProfile, type CustomerListItem, type DashboardStats, type Order, type OrderStatus, type PaymentStatus, type ProductFull } from '@/lib/shop-types';

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

const api = adminApi;

type Tab = 'dashboard' | 'sale' | 'orders' | 'products' | 'customers' | 'visitors' | 'reports' | 'settings';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Order placed', confirmed: 'Confirmed', preparing: 'Preparing',
  delivering: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled',
};
const FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered'];
const PAY_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid', paid: 'Paid',
};

function shownPay(status: string): PaymentStatus {
  return status === 'paid' ? 'paid' : 'unpaid';
}
const AREAS = Object.keys(DELIVERY_FEES);

function prettyName(name: string) {
  const letters = name.replace(/[^A-Za-z]/g, '');
  if (letters && letters === letters.toUpperCase()) {
    return name.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
  }
  return name;
}

function waHref(phone: string, text: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `255${digits.slice(1)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function Brand({ admin = false }: { admin?: boolean }) {
  return (
    <p className="brand">
      <span>AfroFurnishers</span>
      {admin && <em>admin</em>}
    </p>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()}>
        <header className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

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
      await api('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
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
        <Brand />
        <h1>Admin sign in</h1>
        <p className="muted">This area is private. Sign in with the admin password configured for this shop.</p>
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

function Dashboard({ stats, goOrders, goSales }: { stats: DashboardStats; goOrders: (status: string) => void; goSales: () => void }) {
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
      <div className="pos-actions">
        <button type="button" className="btn-primary sm" onClick={goSales}><Plus size={14} /> Add sale</button>
        <button type="button" className="btn-ghost sm" onClick={() => goOrders('all')}>Orders</button>
      </div>
      <div className="stat-grid">
        {cards.map(c => (
          <div key={c.label} className={`stat tone-${c.tone}`}>
            <span className="stat-icon"><c.icon size={18} /></span>
            <div className="stat-copy"><small>{c.label}</small><strong>{c.value}</strong><span className="muted">{c.sub}</span></div>
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
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [q, filter]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = list.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

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
      <div className="table-wrap"><table className="orders-table list-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Pay</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {visible.map(o => (
            <OrderRow key={o.id} o={o} onOpen={() => setOpen(o.id)} />
          ))}
        </tbody>
      </table></div>
      <Pager page={safePage} pages={pages} onPage={setPage} />
      {!list.length && <p className="muted">No orders match.</p>}
      {orders.find(o => o.id === open) && (
        <OrderDialog
          o={orders.find(o => o.id === open)!}
          onClose={() => setOpen(null)}
          patch={patch}
        />
      )}
    </Card>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button type="button" className="btn-ghost sm" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="muted">{page + 1} of {pages}</span>
      <button type="button" className="btn-ghost sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

const PAGE_SIZE = 15;

function OrderRow({ o, onOpen }: { o: Order; onOpen: () => void }) {
  return (
    <tr>
      <td className="lead" data-label="Order"><strong>{o.id}</strong><br /><small className="muted">{timeAgo(o.createdAt)}</small></td>
      <td data-label="Customer">{o.customer.name}<br /><small className="muted">{o.customer.phone} · {o.customer.area}</small></td>
      <td data-label="Items">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
      <td data-label="Total"><strong>{money(o.total)}</strong><br /><small className="muted">Cash</small></td>
      <td data-label="Pay"><span className={`pill pay-${shownPay(o.paymentStatus)}`}>{PAY_LABEL[shownPay(o.paymentStatus)]}</span></td>
      <td data-label="Status"><span className={`pill st-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
      <td className="actions"><button className="link" onClick={onOpen}>Manage</button></td>
    </tr>
  );
}

function OrderDialog({ o, onClose, patch }: { o: Order; onClose: () => void; patch: (o: Order, b: object) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function run(b: object) {
    setBusy(true);
    try { await patch(o, b); } finally { setBusy(false); }
  }
  const at = FLOW.indexOf(o.status);
  const next = at >= 0 && at < FLOW.length - 1 ? FLOW[at + 1] : null;
  return (
    <Modal title={o.id} wide onClose={onClose}>
      <p className="manage-kicker">{o.source === 'admin' ? 'Counter sale' : 'Website order'} · the customer sees this same line</p>
      <div className="manage-layout">
      <div className="step-col">
      <ol className="vstep" aria-label="Order progress">
        {FLOW.map((s, i) => {
          const state = at < 0 ? '' : i < at ? 'done' : i === at ? 'current' : '';
          return (
            <li key={s} className={state}>
              <span className="vdot">{i < at ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
              <span className="vcopy"><small>Step {i + 1}</small><strong>{STATUS_LABEL[s]}</strong></span>
            </li>
          );
        })}
      </ol>
      {o.status === 'cancelled' ? (
        <p className="error">Cancelled. Stock for these pieces was returned.</p>
      ) : (
        <>
          <p className="step-hint">{next ? 'Click Next to move one step. The customer’s page updates with you.' : 'This order is delivered.'}</p>
          <button type="button" className="btn-primary step-next" disabled={busy || !next} onClick={() => next && run({ status: next })}>
            {busy ? 'Saving…' : next ? <><span>Next</span><strong>{STATUS_LABEL[next]}</strong></> : 'Delivered'}
          </button>
        </>
      )}
      </div>
      <div className="manage-grid">
        <div>
          <h4>Pieces</h4>
          <div className="receipt-lines">
            {o.items.map((it, i) => (
              <article className="receipt-item" key={`${it.productId}-${i}`}>
                <span className="receipt-no">{i + 1}</span>
                <strong className="receipt-name">{it.name}</strong>
                <span className="receipt-meta">{money(it.price)} × {it.qty}</span>
                <strong className="receipt-amt">{money(it.price * it.qty)}</strong>
              </article>
            ))}
          </div>
          <div className="receipt-sums">
            <p><span>Delivery · {o.customer.area}</span><strong>{money(o.deliveryFee)}</strong></p>
            <p className="total"><span>Total</span><strong>{money(o.total)}</strong></p>
          </div>
        </div>
        <div className="manage-side">
          <h4>Deliver to</h4>
          <p className="who">{prettyName(o.customer.name)}</p>
          <p>{o.customer.phone}</p>
          <p>{o.customer.address}</p>
          <p>{o.customer.area}</p>
          {o.customer.notes && <p className="muted">{o.customer.notes}</p>}
          <p className="muted">Updated {timeAgo(o.updatedAt)}</p>
          <label>Payment
            <select value={shownPay(o.paymentStatus)} disabled={busy} onChange={e => run({ paymentStatus: e.target.value })}>
              {(Object.keys(PAY_LABEL) as PaymentStatus[]).map(s => <option key={s} value={s}>{PAY_LABEL[s]}</option>)}
            </select>
          </label>
          <div className="manage-links">
            <a className="icon-btn" aria-label="Message on WhatsApp" href={waHref(o.customer.phone, `Habari ${o.customer.name}, AfroFurnishers here about order ${o.id} (${STATUS_LABEL[o.status]}, ${money(o.total)}).`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /></a>
            {o.status !== 'cancelled' && (
              <button type="button" className="link danger" disabled={busy} onClick={() => { if (confirm('Cancel this order and return the stock?')) run({ status: 'cancelled' }); }}>Cancel order</button>
            )}
          </div>
        </div>
      </div>
      </div>
    </Modal>
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
      <button className="btn-primary sm" onClick={() => { setEditing(null); setDraft(EMPTY); setCreating(true); }}><Plus size={14} /> New</button>
    </div>}>
      {error && <p className="error">{error}</p>}
      <p className="muted sale-lead">{items.filter(p => p.active).reduce((s, p) => s + p.stock, 0)} units on hand · {items.filter(p => p.active && p.stock <= 5).length} pieces at 5 or below.</p>
      {creating && (
        <Modal title="New product" onClose={() => setCreating(false)}>
          {form(draft, setDraft)}
        </Modal>
      )}
      {editing && (
        <Modal title="Edit product" onClose={() => setEditing(null)}>
          {form(draft, setDraft, editing)}
        </Modal>
      )}
      <div className="table-wrap"><table className="list-table">
        <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {list.map(p => (
            <ProductRow key={p.id} p={p}
              onEdit={() => { setCreating(false); setEditing(p.id); setDraft({ ...p }); }}
              onHide={() => hide(p.id)}
              onStock={d => quickStock(p, d)} />
          ))}
        </tbody>
      </table></div>
    </Card>
  );
}

function ProductRow({ p, onEdit, onHide, onStock }: {
  p: ProductFull; onEdit: () => void; onHide: () => void; onStock: (d: number) => void;
}) {
  return (
    <tr className={p.stock <= 5 ? 'warn' : ''}>
      <td className="lead" data-label="Product"><strong>{p.name}</strong><br /><small className="muted">{p.category} · {p.id}</small></td>
      <td data-label="Price">{money(p.price)}</td>
      <td data-label="Stock">
        <span className="stock-ctl">
          <button className="mini" aria-label="Decrease stock" onClick={() => onStock(-1)}>−</button>
          <strong>{p.stock}</strong>
          <button className="mini" aria-label="Increase stock" onClick={() => onStock(1)}>+</button>
        </span>
      </td>
      <td data-label="Status">{p.active ? <span className="pill st-delivered">Live</span> : <span className="pill st-cancelled">Hidden</span>}{p.featured ? ' ★' : ''}</td>
      <td className="actions">
        <button className="icon-btn" aria-label={`Edit ${p.name}`} onClick={onEdit}><Pencil size={14} /></button>
        <button className="icon-btn danger" aria-label={`Hide ${p.name}`} onClick={onHide}><Trash2 size={14} /></button>
      </td>
    </tr>
  );
}

/* ---------------- customers / visitors / settings ---------------- */

const BLANK_CUSTOMER = { id: '', name: '', phone: '', area: 'Kinondoni', address: '', notes: '' };

function Customers() {
  const [rows, setRows] = useState<CustomerListItem[]>([]);
  const [draft, setDraft] = useState(BLANK_CUSTOMER);
  const [open, setOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<CustomerListItem | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ customers: CustomerListItem[] }>('/customers');
    setRows(data.customers);
  }, []);

  useEffect(() => { load().catch(() => setError('Could not load customers')); }, [load]);

  function startNew() {
    setDraft(BLANK_CUSTOMER);
    setError('');
    setOpen(true);
  }

  function startEdit(row: CustomerListItem) {
    setDraft({ id: row.id, name: row.name, phone: row.phone, area: row.area || 'Kinondoni', address: row.address, notes: row.notes });
    setError('');
    setOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = JSON.stringify(draft);
      if (draft.id) await api(`/customers/${encodeURIComponent(draft.id)}`, { method: 'PATCH', body });
      else await api('/customers', { method: 'POST', body });
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: CustomerListItem) {
    setError('');
    setBusy(true);
    try {
      await api(`/customers/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      setPendingRemove(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card wide title={`${rows.length} customers`} action={<button type="button" className="btn-primary sm" onClick={startNew}><Plus size={14} /> Add</button>}>
      {error && !open && <p className="error">{error}</p>}
      <div className="table-wrap"><table className="list-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Area</th><th>Orders</th><th>Spent</th><th>Last order</th><th></th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className="lead" data-label="Name"><strong>{prettyName(r.name)}</strong></td>
              <td data-label="Phone">{r.phone}</td>
              <td data-label="Area">{r.area}</td>
              <td data-label="Orders">{r.orders}</td>
              <td className="nowrap" data-label="Spent">{money(r.spent)}</td>
              <td className="muted" data-label="Last order">{r.lastOrder ? timeAgo(r.lastOrder) : '—'}</td>
              <td className="actions">
                <div className="row-icons">
                  <a className="icon-btn" aria-label={`Message ${r.name} on WhatsApp`} href={waHref(r.phone, `Habari ${r.name}, AfroFurnishers here.`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /></a>
                  <button type="button" className="icon-btn" aria-label={`Edit ${r.name}`} onClick={() => startEdit(r)}><Pencil size={15} /></button>
                  <button type="button" className="icon-btn" aria-label={`Remove ${r.name}`} onClick={() => setPendingRemove(r)}><Trash2 size={15} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {!rows.length && <p className="muted">No customers yet. Add one to keep their name and phone.</p>}
      {pendingRemove && (
        <Modal title="Remove customer" onClose={() => setPendingRemove(null)}>
          <p>Remove {prettyName(pendingRemove.name)} from this list. Past sales stay in Sales.</p>
          {error && <p className="error">{error}</p>}
          <div className="profile-actions">
            <button type="button" className="btn-primary sm" disabled={busy} onClick={() => remove(pendingRemove)}>{busy ? 'Removing…' : 'Remove'}</button>
            <button type="button" className="btn-ghost sm" onClick={() => setPendingRemove(null)}>Keep</button>
          </div>
        </Modal>
      )}
      {open && (
        <Modal title={draft.id ? 'Update customer' : 'Add customer'} onClose={() => setOpen(false)}>
          <form className="stack" onSubmit={save}>
            <label>Name<input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} required placeholder="Amina Juma" /></label>
            <label>Phone<input value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} required placeholder="0712 000 000" /></label>
            <label>Area
              <select value={draft.area} onChange={e => setDraft({ ...draft, area: e.target.value })}>
                {AREAS.map(area => <option key={area} value={area}>{area}</option>)}
              </select>
            </label>
            <label>Address<input value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} placeholder="Street, house, landmark" /></label>
            <label>Note<input value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Gate code, invoice, floor" /></label>
            {error && <p className="error">{error}</p>}
            <button className="btn-primary sm" disabled={busy}>{busy ? 'Saving…' : draft.id ? 'Save changes' : 'Add customer'}</button>
          </form>
        </Modal>
      )}
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

const EMPTY_PROFILE: AdminProfile = { name: '', phone: '', role: 'Admin', email: '', photo: '' };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'AF';
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('');
}

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 240;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Could not read that photo')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that photo')); };
    img.src = url;
  });
}

function Settings({ bump }: { bump: () => void }) {
  const [profile, setProfile] = useState<AdminProfile>(EMPTY_PROFILE);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api<{ profile: AdminProfile; passwordFromServer: boolean }>('/admin/profile')
      .then(data => {
        setProfile({ ...EMPTY_PROFILE, ...data.profile });
        setLocked(Boolean(data.passwordFromServer));
      })
      .catch(() => {});
  }, []);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setProfileErr('');
    try {
      const photo = await readPhoto(file);
      setProfile(currentProfile => ({ ...currentProfile, photo }));
    } catch (e) {
      setProfileErr(e instanceof Error ? e.message : 'Could not read that photo');
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setProfileBusy(true);
    try {
      const data = await api<{ profile: AdminProfile }>('/admin/profile', { method: 'PATCH', body: JSON.stringify(profile) });
      setProfile(data.profile);
      setProfileMsg('Saved. This is how the workshop sees you.');
    } catch (e) {
      setProfileErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePw(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      await api('/admin/login', { method: 'PATCH', body: JSON.stringify({ current, next }) });
      setMsg('Password changed. Use the new one next time.');
      setCurrent('');
      setNext('');
      bump();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed';
      setErr(message.includes('ADMIN_PASSWORD')
        ? 'This password is set on the shop server, so change it there.'
        : message);
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
    <div className="settings-page">
      <form className="profile-hero" onSubmit={saveProfile}>
        <label className="avatar-pick">
          {profile.photo
            ? <img src={profile.photo} alt="" />
            : <span className="ph">{initials(profile.name)}</span>}
          <input type="file" accept="image/*" onChange={e => onPhoto(e.target.files?.[0])} />
          <em>Change photo</em>
        </label>
        <div className="profile-fields">
          <div>
            <p className="manage-kicker">Your profile</p>
            <h2>{profile.name.trim() || 'Add your name'}</h2>
          </div>
          <div className="fgrid">
            <label>Name<input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required placeholder="Your name" /></label>
            <label>Role<input value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} placeholder="Workshop admin" /></label>
            <label>Phone<input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+255 692 009 222" /></label>
            <label>Email<input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="you@afrofurnishers.co.tz" /></label>
          </div>
          {profileErr && <p className="error">{profileErr}</p>}
          {profileMsg && <p className="ok">{profileMsg}</p>}
          <div className="profile-actions">
            <button className="btn-primary sm" disabled={profileBusy}>{profileBusy ? 'Saving…' : 'Save details'}</button>
            {profile.photo && <button type="button" className="btn-ghost sm" onClick={() => setProfile({ ...profile, photo: '' })}>Remove photo</button>}
          </div>
        </div>
      </form>
      <div className="cols-2">
      <Card title="Password">
        <form onSubmit={changePw} className="stack">
          <label>Current password<input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" /></label>
          <label>New password<input type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" /></label>
          {err && <p className="error">{err}</p>}
          {msg && <p className="ok">{msg}</p>}
          <button className="btn-primary sm" disabled={locked}>Update password</button>
        </form>
        {locked && <p className="muted">This shop password is set on the server. Personal details above still save.</p>}
      </Card>
      <Card title="Store & payments">
        <p className="row"><span><Banknote size={14} /> Cash on delivery</span><strong>Pay when it arrives</strong></p>
        <p className="row"><span><Wallet size={14} /> Delivery fees</span><strong>15k – 35k by area</strong></p>
        <button className="btn-ghost sm" onClick={backup}><Download size={14} /> Download backup (JSON)</button>
      </Card>
      </div>
    </div>
  );
}

/* ---------------- new sale ---------------- */

function NewSale({ bump, refreshKey, notice, onCreated }: { bump: () => void; refreshKey: number; notice: string; onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState('');
  const [manageId, setManageId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductFull[]>([]);
  const [catalog, setCatalog] = useState<ProductFull[]>([]);
  const [lines, setLines] = useState<{ productId: string; qty: number }[]>([{ productId: '', qty: 1 }]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('Kinondoni');
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [status, setStatus] = useState<OrderStatus>('confirmed');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      const data = await api<{ orders: Order[] }>('/orders');
      setOrders(data.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load sales');
    }
  }, []);

  useEffect(() => {
    api<{ products: ProductFull[] }>('/products?all=1')
      .then(d => {
        setCatalog(d.products);
        setProducts(d.products.filter(p => p.active));
      })
      .catch(() => setError('Could not load products'));
    loadOrders();
  }, [loadOrders, refreshKey]);

  const shown = useMemo(() => orders.filter(o =>
    `${o.id} ${o.customer.name} ${o.customer.phone}`.toLowerCase().includes(q.toLowerCase()),
  ), [orders, q]);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [q]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = shown.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const managed = orders.find(o => o.id === manageId) || null;

  const priced = lines.map(l => {
    const p = products.find(x => x.id === l.productId);
    return { ...l, product: p, line: p ? p.price * Math.max(0, l.qty) : 0 };
  });
  const chosen = priced.filter(l => l.product);
  const subtotal = chosen.reduce((s, l) => s + l.line, 0);
  const areaFee = deliveryFeeFor(area);
  const fee = chosen.length > 0 ? areaFee : 0;
  const total = subtotal + fee;
  const qtyByProduct = chosen.reduce<Record<string, number>>((acc, l) => {
    acc[l.productId] = (acc[l.productId] || 0) + l.qty;
    return acc;
  }, {});
  const stockNote = chosen.map(l => {
    const p = l.product!;
    const asked = qtyByProduct[l.productId] || 0;
    return asked > p.stock ? `Only ${p.stock} left of ${p.name}. This sale asks for ${asked}.` : '';
  }).find(Boolean) || '';

  function setLine(i: number, patch: Partial<{ productId: string; qty: number }>) {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const items = chosen.filter(l => l.qty > 0);
    if (!items.length) { setError('Add at least one piece.'); return; }
    if (stockNote) { setError(stockNote); return; }
    setBusy(true);
    try {
      const data = await api<{ order: Order }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map(l => ({ productId: l.productId, qty: l.qty })),
          customer: { name, phone, address, area, notes },
          payment: 'cod',
          paymentStatus,
          status,
        }),
      });
      setOpen(false);
      setLines([{ productId: '', qty: 1 }]);
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      await loadOrders();
      bump();
      onCreated(data.order.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the sale');
    } finally {
      setBusy(false);
    }
  }

  const units = catalog.filter(p => p.active).reduce((s, p) => s + p.stock, 0);
  const low = catalog.filter(p => p.active && p.stock <= 5).length;

  return (
    <>
      {notice && <p className="ok banner">{notice}</p>}
      <Card wide title="Sales" action={<button type="button" className="btn-primary sm" onClick={() => setOpen(true)}><Plus size={14} /> Add sale</button>}>
        <div className="sales-bar">
          <p className="muted sale-lead">{shown.length} sales · {units} units in stock{low ? ` · ${low} low` : ''}</p>
          <div className="search"><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, sale" aria-label="Search sales" /></div>
        </div>
        {error && !open && <p className="error">{error}</p>}
        <div className="table-wrap"><table className="sales-table list-table">
          <thead><tr><th>Customer</th><th>Sale</th><th>Pieces</th><th>Total</th><th>Pay</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {visible.map(o => {
              const extra = o.items.length - 1;
              return (
              <tr key={o.id}>
                <td className="lead" data-label="Customer"><strong>{prettyName(o.customer.name)}</strong><br /><small className="muted">{o.customer.phone}</small></td>
                <td data-label="Sale"><strong>{o.id}</strong><br /><small className="muted">{timeAgo(o.createdAt)} · {o.source === 'admin' ? 'Counter' : 'Website'}</small></td>
                <td data-label="Pieces">{o.items.reduce((s, i) => s + i.qty, 0)} pcs<br /><small className="muted">{o.items[0] ? o.items[0].name : ''}{extra > 0 ? ` + ${extra} more` : ''}</small></td>
                <td className="nowrap" data-label="Total"><strong>{money(o.total)}</strong></td>
                <td data-label="Pay"><span className={`pill pay-${shownPay(o.paymentStatus)}`}>{PAY_LABEL[shownPay(o.paymentStatus)]}</span></td>
                <td data-label="Status"><span className={`pill st-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                <td className="actions"><button className="link" onClick={() => setManageId(o.id)}>Open</button></td>
              </tr>
              );
            })}
          </tbody>
        </table></div>
        {!shown.length && <p className="muted">No sales match.</p>}
        <Pager page={safePage} pages={pages} onPage={setPage} />
      </Card>
      {managed && (
        <OrderDialog o={managed} onClose={() => setManageId(null)} patch={async (o, body) => {
          await api(`/orders/${o.id}`, { method: 'PATCH', body: JSON.stringify(body) });
          await loadOrders();
          bump();
        }} />
      )}
      {open && (
        <Modal title="New sale" wide onClose={() => setOpen(false)}>
          <form className="pos" onSubmit={submit}>
            <div className="pos-main">
              <div className="fgrid">
                <label>Name<input value={name} onChange={e => setName(e.target.value)} required placeholder="Grace M." /></label>
                <label>Phone<input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="0712 000 000" /></label>
                <label className="full">Address<input value={address} onChange={e => setAddress(e.target.value)} required placeholder="Street, house, landmark" /></label>
                <label>Area
                  <select value={area} onChange={e => setArea(e.target.value)}>
                    {AREAS.map(a => <option key={a} value={a}>{a} · {money(DELIVERY_FEES[a])}</option>)}
                  </select>
                </label>
                <label>Note<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Invoice, floor, gate code" /></label>
                <label>Payment status
                  <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}>
                    {(Object.keys(PAY_LABEL) as PaymentStatus[]).map(s => <option key={s} value={s}>{PAY_LABEL[s]}</option>)}
                  </select>
                </label>
                <label className="full">Start the customer’s progress at
                  <select value={status} onChange={e => setStatus(e.target.value as OrderStatus)}>
                    {FLOW.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </label>
              </div>
              <div className="pos-lines-head">
                <h4>Pieces</h4>
                <button type="button" className="link" onClick={() => setLines([...lines, { productId: '', qty: 1 }])}><Plus size={14} /> Add piece</button>
              </div>
              <div className="sale-scroll">
                <table className="piece-table">
                  <thead><tr><th>Product</th><th>Qty</th><th>Stock</th><th>Amount</th><th></th></tr></thead>
                  <tbody>
                    {priced.map((l, i) => {
                      const asked = l.product ? (qtyByProduct[l.productId] || 0) : 0;
                      const over = Boolean(l.product && asked > l.product.stock);
                      return (
                        <tr key={i} className={over ? 'over' : ''}>
                          <td>
                            <select value={l.productId} onChange={e => setLine(i, { productId: e.target.value })} required aria-label={`Product ${i + 1}`}>
                              <option value="">Choose a piece</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name} · {money(p.price)}</option>)}
                            </select>
                          </td>
                          <td className="qty-cell">
                            <input type="number" min={1} max={99} aria-label={`Quantity ${i + 1}`} value={l.qty} onChange={e => setLine(i, { qty: Math.max(1, Number(e.target.value) || 1) })} />
                          </td>
                          <td className={over ? 'error' : 'muted'}>{l.product ? `${l.product.stock} left${over ? ` · asks ${asked}` : ''}` : '—'}</td>
                          <td className="nowrap">{l.product ? <><strong>{money(l.line)}</strong><br /><small className="muted">{money(l.product.price)} × {l.qty}</small></> : '—'}</td>
                          <td><button type="button" className="icon-btn" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, idx) => idx !== i))}><Trash2 size={14} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <aside className="pos-receipt">
              <div className="receipt-top">
                <div>
                  <p className="manage-kicker">Receipt</p>
                  <strong>{name.trim() || 'New sale'}</strong>
                </div>
                <span className="receipt-count">{chosen.length}</span>
              </div>
              {chosen.length === 0 && <p className="muted">Choose a piece. Each one shows here on its own.</p>}
              <div className="receipt-lines">
              {chosen.map((l, i) => (
                <article className="receipt-item" key={`${l.productId}-${i}`}>
                  <span className="receipt-no">{i + 1}</span>
                  <strong className="receipt-name">{l.product!.name}</strong>
                  <span className="receipt-meta">{money(l.product!.price)} × {l.qty}</span>
                  <strong className="receipt-amt">{money(l.line)}</strong>
                </article>
              ))}
              </div>
              <div className="receipt-sums">
                <p><span>Subtotal</span><strong>{money(subtotal)}</strong></p>
                <p>
                  <span>Delivery<small>{area}{chosen.length ? '' : ` · ${money(areaFee)} once a piece is added`}</small></span>
                  <strong>{money(fee)}</strong>
                </p>
                <p className="total"><span>Total</span><strong>{money(total)}</strong></p>
              </div>
              {(stockNote || error) && <p className="error">{stockNote || error}</p>}
              <button className="btn-primary" disabled={busy || Boolean(stockNote)}>
                {busy ? 'Saving…' : <><span>Record sale</span><strong>{money(total)}</strong></>}
              </button>
            </aside>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ---------------- reports ---------------- */

function Reports() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const items = [
    { id: 'sales' as const, title: 'Sales report', detail: 'Every sale with the customer, date, pieces, total, and status.' },
    { id: 'stock' as const, title: 'Stock report', detail: 'Pieces on hand, the price, and the value sitting in the showroom.' },
    { id: 'full' as const, title: 'Shop report', detail: 'Sales and stock together in one file.' },
  ];
  async function download(kind: 'sales' | 'stock' | 'full') {
    setBusy(kind);
    setError('');
    try {
      const [orderData, productData] = await Promise.all([
        api<{ orders: Order[] }>('/orders'),
        api<{ products: ProductFull[] }>('/products?all=1'),
      ]);
      downloadShopReport(orderData.orders, productData.products, kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the report');
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="report-list">
      {error && <p className="error">{error}</p>}
      {items.map(item => (
        <article key={item.id} className="report-card">
          <span className="stat-icon"><FileDown size={18} /></span>
          <div>
            <strong>{item.title}</strong>
            <p className="muted">{item.detail}</p>
          </div>
          <button type="button" className="btn-primary sm" disabled={busy !== null} onClick={() => download(item.id)}>
            <Download size={14} /> {busy === item.id ? 'Preparing…' : 'Download'}
          </button>
        </article>
      ))}
    </div>
  );
}

/* ---------------- shell ---------------- */

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sale', label: 'Sales', icon: ShoppingBag },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'products', label: 'Stock', icon: Boxes },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'reports', label: 'Reports', icon: FileDown },
  { id: 'visitors', label: 'Visitors', icon: Eye },
  { id: 'settings', label: 'Settings', icon: RefreshCw },
];

export function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [orderFilter, setOrderFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    fetch('/api/admin/login', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setAuthed(Boolean(d.authenticated)))
      .catch(() => setAuthed(false));
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
    } catch { /* still leave the screen */ }
    setAuthed(false);
    setStats(null);
  }

  function goOrders(status: string) {
    setOrderFilter(status);
    setTab('orders');
  }

  if (authed === null) return <div className="admin-app"><div className="login-wrap"><p className="muted">Loading…</p></div></div>;
  if (!authed) return <div className="admin-app"><Login onOk={() => { setAuthed(true); bump(); }} /></div>;

  return (
    <div className="admin-app"><div className="shell">
      <aside className="side">
        <Brand admin />
        <nav>
          {TABS.map(t => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              <t.icon size={17} /> {t.label}
              {t.id === 'orders' && stats && stats.pendingOrders > 0 && <span className="nav-count">{stats.pendingOrders}</span>}
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
        {notice && tab === 'orders' && <p className="ok banner">{notice}</p>}
        {tab === 'dashboard' && (stats ? <Dashboard stats={stats} goOrders={goOrders} goSales={() => setTab('sale')} /> : <p className="muted">Loading dashboard…</p>)}
        {tab === 'sale' && <NewSale bump={bump} refreshKey={refreshKey} notice={notice} onCreated={id => setNotice(`${id} is in the sales list. The customer can track the same progress.`)} />}
        {tab === 'orders' && <Orders initialFilter={orderFilter} refreshKey={refreshKey} bump={bump} />}
        {tab === 'products' && <Products refreshKey={refreshKey} bump={bump} />}
        {tab === 'customers' && <Customers />}
        {tab === 'reports' && <Reports />}
        {tab === 'visitors' && (stats ? <Visitors stats={stats} /> : <p className="muted">Loading…</p>)}
        {tab === 'settings' && <Settings bump={bump} />}
      </main>
    </div></div>
  );
}
