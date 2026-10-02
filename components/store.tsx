'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { products as staticProducts, money } from '@/lib/catalog';
import type { ProductFull, PublicCustomer } from '@/lib/shop-types';

type Cart = Record<string, number>;

interface Store {
  cart: Cart;
  wishlist: string[];
  products: ProductFull[];
  productsReady: boolean;
  ready: boolean;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  add: (id: string, qty?: number) => void;
  change: (id: string, delta: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  toggle: (id: string) => void;
  notify: (text: string) => void;
  customer: PublicCustomer | null;
  customerReady: boolean;
  signup: (input: { name: string; phone: string; password: string }) => Promise<PublicCustomer>;
  login: (input: { phone: string; password: string }) => Promise<PublicCustomer>;
  logout: () => Promise<void>;
  count: number;
  subtotal: number;
  productById: (id: string) => ProductFull | undefined;
}

const Context = createContext<Store | null>(null);

function toFull(): ProductFull[] {
  const t = new Date().toISOString();
  return staticProducts.map(p => ({
    ...p,
    stock: 10,
    description: `${p.name} — ${p.material}. ${p.dimensions}.`,
    active: true,
    createdAt: t,
    updatedAt: t,
  }));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({});
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductFull[]>(() => toFull());
  const [productsReady, setProductsReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [customer, setCustomer] = useState<PublicCustomer | null>(null);
  const [customerReady, setCustomerReady] = useState(false);
  const [notice, setNotice] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('afro-cart') || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        const clean = Object.fromEntries(
          Object.entries(saved).filter(([, n]) => typeof n === 'number' && Number.isInteger(n) && (n as number) > 0 && (n as number) <= 99),
        ) as Cart;
        setCart(clean);
      }
      const hearts: unknown = JSON.parse(localStorage.getItem('afro-wishlist') || '[]');
      if (Array.isArray(hearts)) setWishlist(hearts.filter((id): id is string => typeof id === 'string'));
    } catch { /* keep defaults */ }
    setReady(true);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    let live = true;
    fetch('/api/account', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (live) setCustomer(data?.customer ?? null); })
      .catch(() => { if (live) setCustomer(null); })
      .finally(() => { if (live) setCustomerReady(true); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    fetch('/api/products', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (live && Array.isArray(data?.products)) {
          setProducts(data.products);
          // Drop cart lines for products that no longer exist
          setCart(old => {
            const ids = new Set<string>(data.products.map((p: ProductFull) => p.id));
            const next: Cart = {};
            for (const [id, qty] of Object.entries(old)) if (ids.has(id)) next[id] = qty;
            return next;
          });
        }
      })
      .catch(() => { /* static fallback stays */ })
      .finally(() => { if (live) setProductsReady(true); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('afro-cart', JSON.stringify(cart));
      localStorage.setItem('afro-wishlist', JSON.stringify(wishlist));
    } catch { /* session still works */ }
  }, [cart, wishlist, ready]);

  const signup = useCallback(async (input: { name: string; phone: string; password: string }) => {
    const res = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signup', ...input }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not create account');
    setCustomer(data.customer);
    return data.customer as PublicCustomer;
  }, []);

  const login = useCallback(async (input: { phone: string; password: string }) => {
    const res = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', ...input }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not sign in');
    setCustomer(data.customer);
    return data.customer as PublicCustomer;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/account', { method: 'DELETE' });
    setCustomer(null);
  }, []);

  const notify = useCallback((text: string) => {
    setNotice(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(''), 3200);
  }, []);

  const productById = useCallback((id: string) => products.find(p => p.id === id), [products]);

  const add = useCallback((id: string, qty = 1) => {
    setCart(old => ({ ...old, [id]: Math.min(99, (old[id] || 0) + qty) }));
    notify('Added to your bag.');
  }, [notify]);

  const change = useCallback((id: string, delta: number) => {
    setCart(old => {
      const next = { ...old, [id]: Math.min(99, (old[id] || 0) + delta) };
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setCart(old => {
      if (qty <= 0) {
        const next = { ...old };
        delete next[id];
        return next;
      }
      return { ...old, [id]: Math.min(99, Math.floor(qty)) };
    });
  }, []);

  const remove = useCallback((id: string) => {
    setCart(old => {
      const next = { ...old };
      delete next[id];
      return next;
    });
  }, []);

  const clear = useCallback(() => setCart({}), []);

  const toggle = useCallback((id: string) => {
    setWishlist(old => (old.includes(id) ? old.filter(x => x !== id) : [...old, id]));
  }, []);

  const { count, subtotal } = useMemo(() => {
    let c = 0;
    let s = 0;
    for (const [id, qty] of Object.entries(cart)) {
      c += qty;
      const p = products.find(p => p.id === id);
      if (p) s += p.price * qty;
    }
    return { count: c, subtotal: s };
  }, [cart, products]);

  const value: Store = { cart, wishlist, products, productsReady, ready, cartOpen, setCartOpen, add, change, setQty, remove, clear, toggle, notify, customer, customerReady, signup, login, logout, count, subtotal, productById };

  return (
    <Context.Provider value={value}>
      {children}
      <div className="notification-region" role="status" aria-live="polite">
        <AnimatePresence>
          {notice && (
            <motion.div className="notification" initial={{ y: 25, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 15, opacity: 0 }}>
              <Check size={18} />
              <span>{notice}</span>
              <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Context.Provider>
  );
}

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('StoreProvider required');
  return store;
}

export { money };
