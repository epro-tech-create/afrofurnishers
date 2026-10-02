'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore, money } from './store';

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, change, remove, subtotal, count, productById } = useStore();
  const lines = Object.entries(cart);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            className="cart-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            aria-hidden
          />
          <motion.aside
            className="cart-drawer"
            role="dialog"
            aria-label="Shopping bag"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="cart-drawer-head">
              <h2><ShoppingBag size={19} /> Your bag ({count})</h2>
              <button className="icon-btn" aria-label="Close bag" onClick={() => setCartOpen(false)}><X size={18} /></button>
            </div>
            <div className="cart-drawer-body">
              {lines.length === 0 ? (
                <div className="empty">
                  <p className="muted">Your bag is empty.</p>
                  <Link className="button" href="/shop" onClick={() => setCartOpen(false)}>Browse furniture</Link>
                </div>
              ) : (
                lines.map(([id, qty]) => {
                  const p = productById(id);
                  if (!p) return null;
                  return (
                    <div key={id} className="cart-line">
                      <img src={`/assets/${p.image}.jpg`} alt="" width={120} height={120} />
                      <div>
                        <strong>{p.name}</strong>
                        <small className="muted">{money(p.price)} each</small>
                        <div className="qty">
                          <button aria-label={`Decrease ${p.name}`} onClick={() => change(id, -1)}><Minus size={15} /></button>
                          <span aria-live="polite">{qty}</span>
                          <button aria-label={`Increase ${p.name}`} onClick={() => change(id, 1)}><Plus size={15} /></button>
                        </div>
                      </div>
                      <div className="cart-line-side">
                        <strong>{money(p.price * qty)}</strong>
                        <button className="link-danger" aria-label={`Remove ${p.name}`} onClick={() => remove(id)}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {lines.length > 0 && (
              <div className="cart-drawer-foot">
                <p className="cart-total-line"><span>Subtotal</span><strong>{money(subtotal)}</strong></p>
                <p className="muted">Sign in at checkout to track delivery · Pay with M-Pesa or Cash.</p>
                <Link className="button" href="/checkout" onClick={() => setCartOpen(false)}>Checkout →</Link>
                <Link className="text-link" href="/cart" onClick={() => setCartOpen(false)}>View bag</Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
