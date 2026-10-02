'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Minus, Plus, Trash2, Truck, Banknote, PackageSearch, RotateCcw, ShoppingBag, CheckCircle2, Phone, MapPin, ClipboardList, BadgeCheck, Package, Home, Check } from 'lucide-react';
import { money } from '@/lib/catalog';
import { DELIVERY_FEES, type Order } from '@/lib/shop-types';
import { AccountAuth } from './account-auth';
import { Loader } from './loader';
import { useStore } from './store';

export function CartPage() {
  const { cart, change, setQty, remove, clear, subtotal, count, productById, setCartOpen } = useStore();
  const lines = Object.entries(cart);

  if (!lines.length) {
    return (
      <section className="page article">
        <p className="eyebrow">SHOP</p>
        <h1>Your bag is empty.</h1>
        <p className="muted">Beautiful furniture is waiting. Browse the collection and add pieces to your bag.</p>
        <div className="buttons">
          <Link className="button" href="/shop">Browse furniture →</Link>
          <Link className="text-link" href="/track">Track an order →</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page cart-page">
      <p className="eyebrow">YOUR BAG · {count} ITEMS</p>
      <h1>Review your bag.</h1>
      <div className="cart-layout">
        <div className="cart-lines">
          {lines.map(([id, qty]) => {
            const p = productById(id);
            if (!p) return null;
            return (
              <div key={id} className="cart-line cart-line-lg">
                <Link href={`/product/${p.id}`}><img src={`/assets/${p.image}.jpg`} alt={p.name} width={160} height={160} /></Link>
                <div>
                  <Link href={`/product/${p.id}`}><strong>{p.name}</strong></Link>
                  <p className="muted">{p.category} · {money(p.price)} each</p>
                  <div className="qty">
                    <button aria-label="Decrease" onClick={() => change(id, -1)}><Minus size={15} /></button>
                    <input aria-label="Quantity" value={qty} inputMode="numeric" onChange={e => setQty(id, Number(e.target.value))} />
                    <button aria-label="Increase" onClick={() => change(id, 1)}><Plus size={15} /></button>
                  </div>
                </div>
                <div className="cart-line-side">
                  <strong>{money(p.price * qty)}</strong>
                  <button className="link-danger" onClick={() => remove(id)}><Trash2 size={16} /> Remove</button>
                </div>
              </div>
            );
          })}
          <button className="link-danger" onClick={clear}>Clear bag</button>
        </div>
        <aside className="cart-summary">
          <h2>Summary</h2>
          <p><span>Subtotal</span><strong>{money(subtotal)}</strong></p>
          <p className="muted">Delivery fee added at checkout (from TZS 15,000). You’ll sign in so you can track the order.</p>
          <Link className="button" href="/checkout">Checkout →</Link>
          <button className="text-link" onClick={() => setCartOpen(true)}>Quick view bag</button>
        </aside>
      </div>
    </section>
  );
}

export function WishlistPage() {
  const { wishlist, toggle, add, productById } = useStore();
  const items = wishlist.map(id => productById(id)).filter(Boolean);
  if (!items.length) {
    return (
      <section className="page article">
        <p className="eyebrow">WISHLIST</p>
        <h1>Saved for later.</h1>
        <p className="muted">Tap the heart on any product to save it here.</p>
        <Link className="button" href="/shop">Browse furniture →</Link>
      </section>
    );
  }
  return (
    <section className="page">
      <p className="eyebrow">WISHLIST · {items.length}</p>
      <h1>Saved pieces.</h1>
      <div className="products">
        {items.map(p => p && (
          <article key={p.id} className="product">
            <div className="product-image">
              <Link href={`/product/${p.id}`}><img src={`/assets/${p.image}.jpg`} alt={p.name} width={650} height={750} /></Link>
            </div>
            <div className="product-info">
              <div>
                <h3><Link href={`/product/${p.id}`}>{p.name}</Link></h3>
                <p>{p.category}</p>
              </div>
              <span className="price">{money(p.price)}</span>
            </div>
            <div className="buttons">
              <button className="button button-sm" onClick={() => add(p.id)}>Add to bag</button>
              <button className="text-link" onClick={() => toggle(p.id)}>Remove</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const AREAS = Object.keys(DELIVERY_FEES);

const CHECKOUT_STEPS = ['Bag', 'Details', 'Review'] as const;

export function CheckoutPage() {
  const { cart, change, remove, subtotal, productById, clear, customer, customerReady } = useStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', address: '', area: 'Kinondoni', notes: '' });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Order | null>(null);

  const lines = useMemo(() => Object.entries(cart).map(([id, qty]) => ({ p: productById(id), qty })).filter(x => x.p), [cart, productById]);
  const fee = DELIVERY_FEES[form.area] ?? 20000;
  const total = subtotal + (lines.length ? fee : 0);

  useEffect(() => {
    if (!customer) return;
    setForm(f => ({ ...f, name: customer.name, phone: customer.phone }));
  }, [customer]);

  useEffect(() => {
    if (!done) return;
    const id = done.id;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data.order) setDone(data.order);
      } catch { /* keep the last status on screen */ }
    }, 8000);
    return () => clearInterval(timer);
  }, [done]);

  const detailsError = !form.address.trim()
    ? 'Please enter your delivery address.'
    : '';

  function next() {
    setError('');
    if (step === 0 && !lines.length) {
      setError('Your bag is empty.');
      return;
    }
    if (step === 1 && detailsError) {
      setError(detailsError);
      return;
    }
    setStep(s => Math.min(2, s + 1));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function place() {
    setError('');
    setPlacing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map(({ p, qty }) => ({ productId: p!.id, qty })),
          customer: { name: form.name, phone: form.phone, address: form.address, area: form.area, notes: form.notes },
          payment: 'cod',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not place order');
      setDone(data.order);
      clear();
      try {
        localStorage.setItem('afro-last-order', JSON.stringify({ id: data.order.id, phone: form.phone }));
      } catch { /* ok */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place order');
    } finally {
      setPlacing(false);
    }
  }

  if (done) {
    const first = done.customer.name.split(' ')[0];
    return (
      <section className="page account-hub">
        <div className="confirm-hero">
          <span className="confirm-check" aria-hidden><CheckCircle2 size={32} /></span>
          <p className="eyebrow">ORDER CONFIRMED</p>
          <h1>Asante, {first}.</h1>
          <p className="confirm-lead">Your furniture order is saved to your account. Use this number whenever you want to see where it is.</p>
          <p className="order-id-chip">{done.id}</p>
          <OrderProgress status={done.status} />
          <p className="confirm-lead">This line moves when the workshop updates the order. The same steps are on your account.</p>
        </div>
        <div className="receipt">
          {done.items.map(it => (
            <p key={it.productId} className="receipt-row"><span>{it.name} × {it.qty}</span><strong>{money(it.price * it.qty)}</strong></p>
          ))}
          <p className="receipt-row"><span>Delivery to {done.customer.area}</span><strong>{money(done.deliveryFee)}</strong></p>
          <p className="receipt-row total"><span>Total</span><strong>{money(done.total)}</strong></p>
          <p className="receipt-meta">
            <Banknote size={15} /> Pay cash when it arrives
            <br />
            <Phone size={15} /> We will call {done.customer.phone} to confirm.
            <br />
            <MapPin size={15} /> {done.customer.address}, {done.customer.area}
          </p>
        </div>
        <div className="hub-actions">
          <Link className="button" href={`/order/${done.id}`}>Track this order</Link>
          <Link className="button button-outline" href="/orders">See all my orders</Link>
        </div>
      </section>
    );
  }

  if (!lines.length) {
    return (
      <section className="page article">
        <p className="eyebrow">CHECKOUT</p>
        <h1>Nothing to check out yet.</h1>
        <Link className="button" href="/shop">Browse furniture →</Link>
      </section>
    );
  }

  if (!customerReady) {
    return (
      <section className="page article">
        <p className="eyebrow">CHECKOUT</p>
        <h1>Checkout</h1>
        <Loader label="Checking your account" />
      </section>
    );
  }

  if (!customer) {
    return (
      <section className="page checkout-page">
        <p className="eyebrow">CHECKOUT</p>
        <h1>Create an account to check out.</h1>
        <p>Sign up once. After that you can follow every piece from the workshop to your door.</p>
        <div className="checkout-layout">
          <AccountAuth intro="Your name and phone stay on the order, so tracking is tied to you." />
          <aside className="cart-summary" aria-label="Order summary">
            <h2>Your bag</h2>
            {lines.map(({ p, qty }) => p && <p key={p.id}><span>{p.name} × {qty}</span><strong>{money(p.price * qty)}</strong></p>)}
            <p className="grand"><span>Subtotal</span><strong>{money(subtotal)}</strong></p>
            <p className="muted">Delivery is added on the next step.</p>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="page checkout-page">
      <p className="eyebrow">CHECKOUT · STEP {step + 1} OF 3</p>
      <h1>{['Review your bag.', 'Where should it go?', 'Confirm your order.'][step]}</h1>

      <ol className="steps checkout-progress" aria-label="Checkout progress">
        {CHECKOUT_STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="step-num">{i + 1}</span> {s}
          </li>
        ))}
      </ol>

      <div className="checkout-layout">
        <div className="checkout-form">
          {step === 0 && (
            <div className="cart-lines">
              {lines.map(({ p, qty }) => p && (
                <div key={p.id} className="cart-line cart-line-lg">
                  <Link href={`/product/${p.id}`}><img src={`/assets/${p.image}.jpg`} alt={p.name} width={120} height={120} /></Link>
                  <div>
                    <Link href={`/product/${p.id}`}><strong>{p.name}</strong></Link>
                    <p className="muted">{money(p.price)} each</p>
                    <div className="qty">
                      <button aria-label="Decrease" onClick={() => change(p.id, -1)}><Minus size={15} /></button>
                      <span>{qty}</span>
                      <button aria-label="Increase" onClick={() => change(p.id, 1)}><Plus size={15} /></button>
                    </div>
                  </div>
                  <div className="cart-line-side">
                    <strong>{money(p.price * qty)}</strong>
                    <button className="link-danger" onClick={() => remove(p.id)}><Trash2 size={16} /> Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="form-grid">
              <div className="account-lock full">
                <p className="eyebrow">SIGNED IN</p>
                <p><strong>{customer.name}</strong><br />{customer.phone}</p>
                <p className="muted">Orders are saved to this account so you can track them later.</p>
              </div>
              <label className="full">Delivery address<input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required maxLength={200} placeholder="Street, ward, landmark" autoComplete="street-address" /></label>
              <label>Area
                <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}>
                  {AREAS.map(a => <option key={a} value={a}>{a} · {money(DELIVERY_FEES[a])}</option>)}
                </select>
              </label>
              <label>Notes (optional)<input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} maxLength={500} placeholder="Gate, floor, call on arrival…" /></label>
            </div>
          )}

          {step === 2 && (
            <div className="confirm-sheet">
              <div>
                <p className="eyebrow">Deliver to</p>
                <p className="confirm-name">{form.name}</p>
                <p>{form.phone}</p>
                <p>{form.address}</p>
                <p>{form.area}</p>
                {form.notes ? <p className="muted">{form.notes}</p> : null}
              </div>
              <div>
                <p className="eyebrow">Pay with</p>
                <p className="confirm-name">Cash on delivery</p>
                <p className="muted">Pay in cash when the furniture arrives.</p>
              </div>
            </div>
          )}

          {error && <p role="alert" className="form-error">{error}</p>}

          <div className="buttons wizard-nav">
            {step > 0 && <button type="button" className="button button-outline" onClick={() => { setError(''); setStep(s => s - 1); }}>← Back</button>}
            {step < 2 && <button type="button" className="button" onClick={next}>Continue →</button>}
          </div>
          <p className="muted">Need help? Call us on <a className="text-link" href="tel:+255692009222">+255 692 009 222</a>.</p>
        </div>

        <aside className="cart-summary" aria-label="Order summary">
          <h2>Summary</h2>
          {lines.map(({ p, qty }) => p && <p key={p.id}><span>{p.name} × {qty}</span><strong>{money(p.price * qty)}</strong></p>)}
          <p><span><Truck size={14} /> Subtotal</span><strong>{money(subtotal)}</strong></p>
          <p><span>Delivery · {form.area}</span><strong>{money(fee)}</strong></p>
          <p className="grand"><span>Total</span><strong>{money(total)}</strong></p>
          {step === 2 && (
            <button type="button" className="button" disabled={placing} onClick={place}>
              {placing ? 'Placing order…' : `Place order · ${money(total)}`}
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered'] as const;
const STEP_LABEL: Record<(typeof STATUS_STEPS)[number], string> = {
  pending: 'Order placed', confirmed: 'Confirmed', preparing: 'Preparing',
  delivering: 'On the way', delivered: 'Delivered',
};
const STEP_ICON = {
  pending: ClipboardList, confirmed: BadgeCheck, preparing: Package, delivering: Truck, delivered: Home,
} as const;

function OrderProgress({ status }: { status: string }) {
  if (status === 'cancelled') return <p className="form-error">This order was cancelled.</p>;
  const at = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
  return (
    <ol className="track-line" aria-label="Delivery progress">
      {STATUS_STEPS.map((s, i) => {
        const Icon = STEP_ICON[s];
        const state = at < 0 ? '' : i < at ? 'done' : i === at ? 'current' : '';
        return (
          <li key={s} className={state}>
            <span className="track-dot">{i <= at ? <Check size={14} strokeWidth={3} /> : null}</span>
            <Icon size={18} />
            <small>{STEP_LABEL[s]}</small>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderTrackPage({ initialId = '' }: { initialId?: string }) {
  const { customer, customerReady } = useStore();
  const [id, setId] = useState(initialId);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function lookup(explicitId?: string, e?: FormEvent) {
    e?.preventDefault();
    const value = (explicitId ?? id).trim();
    setError('');
    setOrder(null);
    if (!value) {
      setError('Enter your order number (e.g. AFR-1001).');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order not found');
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order not found');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (customer && initialId) lookup(initialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, initialId]);

  useEffect(() => {
    if (!order) return;
    const current = order.id;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(current)}`, { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data.order) setOrder(data.order);
      } catch { /* keep the last status on screen */ }
    }, 8000);
    return () => clearInterval(timer);
  }, [order]);

  if (!customerReady) {
    return (
      <section className="page article">
        <p className="eyebrow">TRACK ORDER</p>
        <h1>Where is my furniture?</h1>
        <Loader label="Checking your account" />
      </section>
    );
  }

  if (!customer) {
    return (
      <section className="page article track-page">
        <p className="eyebrow">TRACK ORDER</p>
        <h1>Sign in to track your furniture.</h1>
        <p>Orders live on your account. Sign in with the phone you used at checkout.</p>
        <AccountAuth />
      </section>
    );
  }

  return (
    <section className="page account-hub">
      <p className="eyebrow">TRACK ORDER</p>
      <h1>Where is my furniture?</h1>
      <p className="signed-line">Signed in as <strong>{customer.name}</strong> · {customer.phone}</p>
      <form onSubmit={e => lookup(undefined, e)} className="track-search">
        <label>Order number
          <input value={id} onChange={e => setId(e.target.value)} placeholder="AFR-1001" />
        </label>
        <button className="button">{loading ? 'Searching…' : 'Track'}</button>
      </form>
      {loading && <Loader label="Looking up the order" />}
      {error && <p role="alert" className="form-error">{error}</p>}
      {!order && !error && (
        <p className="hub-hint"><PackageSearch size={16} /> The number was on your confirmation. You can also open <Link className="text-link" href="/orders">every order on this account</Link>.</p>
      )}
      {order && (
        <article className="track-card">
          <div className="track-card-head">
            <div>
              <p className="order-id-chip">{order.id}</p>
              <p className="muted">Cash on delivery · {new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <span className={`pill ${ORDER_PILL[order.status] || ''}`}>{order.status === 'cancelled' ? 'Cancelled' : STEP_LABEL[order.status as (typeof STATUS_STEPS)[number]] || order.status}</span>
          </div>
          {order.status === 'cancelled' ? (
            <p className="form-error">This order was cancelled. Message us if you still want the pieces.</p>
          ) : (
            <>
              <OrderProgress status={order.status} />
              <p className="muted">Updated {new Date(order.updatedAt).toLocaleString()}. This line moves when the workshop updates the order.</p>
            </>
          )}
          <div className="receipt">
            {order.items.map(it => (
              <p key={it.productId} className="receipt-row">
                <span className="receipt-item"><img src={`/assets/${it.image}.jpg`} alt="" width={48} height={48} />{it.name} × {it.qty}</span>
                <strong>{money(it.price * it.qty)}</strong>
              </p>
            ))}
            <p className="receipt-row"><span>Delivery · {order.customer.area}</span><strong>{money(order.deliveryFee)}</strong></p>
            <p className="receipt-row total"><span>Total</span><strong>{money(order.total)}</strong></p>
          </div>
          <p className="receipt-meta"><MapPin size={15} /> {order.customer.address}, {order.customer.area}</p>
        </article>
      )}
    </section>
  );
}

const ORDER_PILL: Record<string, string> = {
  pending: 'pill-pending', confirmed: 'pill-confirmed', preparing: 'pill-preparing',
  delivering: 'pill-delivering', delivered: 'pill-delivered', cancelled: 'pill-cancelled',
};

export function OrdersDashboardPage() {
  const { add, setCartOpen, productById, customer, customerReady, logout } = useStore();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) {
      setOrders(null);
      return;
    }
    let live = true;
    setLoading(true);
    setError('');
    fetch('/api/orders', { cache: 'no-store' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load orders');
        if (live) setOrders(data.orders);
      })
      .catch(err => {
        if (live) setError(err instanceof Error ? err.message : 'Could not load orders');
      })
      .finally(() => { if (live) setLoading(false); });
    const timer = setInterval(() => {
      fetch('/api/orders', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => { if (live && Array.isArray(data.orders)) setOrders(data.orders); })
        .catch(() => {});
    }, 10000);
    return () => { live = false; clearInterval(timer); };
  }, [customer]);

  function buyAgain(o: Order) {
    let added = 0;
    for (const it of o.items) {
      const p = productById(it.productId);
      if (p && p.active && p.stock > 0) {
        add(it.productId, Math.min(it.qty, p.stock));
        added += 1;
      }
    }
    if (added) setCartOpen(true);
  }

  const spent = useMemo(
    () => (orders || []).filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
    [orders],
  );

  if (!customerReady) {
    return (
      <section className="page orders-page">
        <p className="eyebrow">MY ORDERS</p>
        <h1>Your orders</h1>
        <Loader label="Checking your account" />
      </section>
    );
  }

  if (!customer) {
    return (
      <section className="page orders-page">
        <p className="eyebrow">MY ORDERS</p>
        <h1>Sign in to track your furniture.</h1>
        <p>Create an account at checkout, then come back here to see every order and where it is.</p>
        <AccountAuth />
      </section>
    );
  }

  return (
    <section className="page orders-page">
      <p className="eyebrow">MY ORDERS</p>
      <h1>Track everything you bought.</h1>
      <p className="muted">Signed in as {customer.name} · {customer.phone}</p>
      <div className="buttons order-account-actions">
        <Link className="text-link" href="/account">Account</Link>
        <button type="button" className="text-link" onClick={() => logout()}>Sign out</button>
      </div>
      {error && <p role="alert" className="form-error">{error}</p>}
      {loading && <Loader label="Loading your orders" />}

      {!orders && !error && !loading && (
        <p className="muted"><ShoppingBag size={14} /> Orders placed with this account appear here. Have one number? <Link className="text-link" href="/track">Look it up →</Link></p>
      )}

      {orders && (
        <>
          <p className="muted" aria-live="polite">
            {orders.length === 0
              ? 'No orders on this account yet. When you check out, they show up here.'
              : `${orders.length} order${orders.length === 1 ? '' : 's'} · ${money(spent)} spent`}
          </p>
          <div className="order-list">
            {orders.map(o => (
              <article key={o.id} className="order-card">
                <div className="order-head">
                  <div>
                    <strong>{o.id}</strong>
                    <small className="muted"> · {new Date(o.createdAt).toLocaleDateString()} · Cash</small>
                  </div>
                  <span className={`pill ${ORDER_PILL[o.status] || ''}`}>{o.status === 'cancelled' ? 'Cancelled' : STEP_LABEL[o.status as (typeof STATUS_STEPS)[number]] || o.status}</span>
                </div>
                <OrderProgress status={o.status} />
                <div className="order-items">
                  {o.items.map(it => (
                    <p key={it.productId}><img src={`/assets/${it.image}.jpg`} alt="" width={44} height={44} /><span>{it.name} × {it.qty}</span><strong>{money(it.price * it.qty)}</strong></p>
                  ))}
                </div>
                <p className="grand"><span>Total (incl. delivery)</span><strong>{money(o.total)}</strong></p>
                {open === o.id && (
                  <div className="review-card">
                    <p className="muted">{o.customer.name} · {o.customer.phone}<br />{o.customer.address}, {o.customer.area}</p>
                    <p className="muted">Payment: {o.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'} · Updated {new Date(o.updatedAt).toLocaleString()}</p>
                  </div>
                )}
                <div className="buttons order-foot">
                  <button type="button" className="text-link" onClick={() => setOpen(open === o.id ? null : o.id)}>{open === o.id ? 'Hide details' : 'Details'}</button>
                  <Link className="text-link" href={`/order/${o.id}`}>Full tracking →</Link>
                  {o.status !== 'cancelled' && (
                    <button type="button" className="text-link" onClick={() => buyAgain(o)}><RotateCcw size={13} /> Buy again</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function AccountPage() {
  const { customer, customerReady, logout } = useStore();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!customer) {
      setOrders(null);
      return;
    }
    let live = true;
    fetch('/api/orders', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (live) setOrders(data.orders || []); })
      .catch(() => { if (live) setOrders([]); });
    const timer = setInterval(() => {
      fetch('/api/orders', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => { if (live && Array.isArray(data.orders)) setOrders(data.orders); })
        .catch(() => {});
    }, 10000);
    return () => { live = false; clearInterval(timer); };
  }, [customer]);

  if (!customerReady) {
    return (
      <section className="page article">
        <p className="eyebrow">ACCOUNT</p>
        <h1>Your account</h1>
        <Loader label="Checking your account" />
      </section>
    );
  }

  if (!customer) {
    return (
      <section className="page article">
        <p className="eyebrow">ACCOUNT</p>
        <h1>Sign in to track your furniture.</h1>
        <p>An account is required at checkout. It keeps your orders together so you can see each piece until it arrives.</p>
        <AccountAuth />
      </section>
    );
  }

  const latest = orders?.[0];

  return (
    <section className="page account-hub">
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>Hello, {customer.name.split(' ')[0]}.</h1>
      <p className="confirm-lead">Orders you place stay on this account, from the moment we confirm them until they arrive.</p>
      <div className="hub-grid">
        <article className="hub-card">
          <p className="muted">Signed in as</p>
          <h2>{customer.name}</h2>
          <p className="signed-line"><Phone size={15} /> {customer.phone}</p>
          {latest ? (
            <div className="latest-order">
              <div>
                <strong>{latest.id}</strong>
                <span className={`pill ${ORDER_PILL[latest.status] || ''}`}>{latest.status === 'cancelled' ? 'Cancelled' : STEP_LABEL[latest.status as (typeof STATUS_STEPS)[number]] || latest.status}</span>
              </div>
              <OrderProgress status={latest.status} />
              <p className="muted">{latest.items.map(it => it.name).join(', ')} · {money(latest.total)}</p>
              <Link className="text-link" href={`/order/${latest.id}`}>Track this order</Link>
            </div>
          ) : (
            {orders ? <p className="muted">No orders yet. Your first checkout will show up here.</p> : <Loader label="Loading your orders" />}
          )}
        </article>
        <div className="hub-card hub-actions-stack">
          <Link className="button" href="/orders">Track my furniture</Link>
          <Link className="button button-outline" href="/shop">Continue shopping</Link>
          <button type="button" className="text-link" onClick={() => logout()}>Sign out</button>
        </div>
      </div>
    </section>
  );
}
