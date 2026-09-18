'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { products } from '@/lib/catalog';

type Cart = Record<string, number>;
interface Store { cart: Cart; wishlist: string[]; ready: boolean; add: (id: string) => void; change: (id: string, delta: number) => void; remove: (id: string) => void; toggle: (id: string) => void; notify: (text: string) => void }
const Context = createContext<Store | null>(null);
const valid = (id: string) => products.some(p => p.id === id);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({});
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('afro-cart') || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) setCart(Object.fromEntries(Object.entries(saved).filter(([id, n]) => valid(id) && typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 99)));
      const hearts: unknown = JSON.parse(localStorage.getItem('afro-wishlist') || '[]');
      if (Array.isArray(hearts)) setWishlist(hearts.filter((id): id is string => typeof id === 'string' && valid(id)));
    } catch { /* Storage may be unavailable or contain an older invalid value. */ }
    setReady(true);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem('afro-cart', JSON.stringify(cart)); localStorage.setItem('afro-wishlist', JSON.stringify(wishlist)); } catch { /* The session still works without persistence. */ } } }, [cart, wishlist, ready]);
  const notify = (text: string) => { setNotice(text); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setNotice(''), 3000); };
  const add = (id: string) => { if (!valid(id)) throw new Error('Unknown product'); setCart(old => ({ ...old, [id]: Math.min(99, (old[id] || 0) + 1) })); notify('A little closer to home. Added to your bag.'); };
  const change = (id: string, delta: number) => setCart(old => { if (!valid(id)) return old; const next = { ...old, [id]: Math.min(99, (old[id] || 0) + delta) }; if (next[id] <= 0) delete next[id]; return next; });
  const remove = (id: string) => setCart(old => { const next = { ...old }; delete next[id]; return next; });
  const toggle = (id: string) => { if (!valid(id)) return; setWishlist(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]); };
  return <Context.Provider value={{ cart, wishlist, ready, add, change, remove, toggle, notify }}>{children}<div className="notification-region" role="status" aria-live="polite"><AnimatePresence>{notice && <motion.div className="notification" initial={{ y: 25, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 15, opacity: 0 }}><Check size={18} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16} /></button></motion.div>}</AnimatePresence></div></Context.Provider>;
}
export function useStore() { const store = useContext(Context); if (!store) throw new Error('StoreProvider required'); return store; }
