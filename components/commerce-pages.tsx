'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { downloadText, money, products } from '@/lib/catalog';
import { useStore } from './store';
import { ProductGrid } from './products';

export function CartPage() {
  const { cart, change, remove, ready } = useStore();
  const items = products.filter(p => cart[p.id]);
  return <section className="page"><p className="eyebrow">A LITTLE CLOSER TO HOME</p><h1>Your bag.</h1>{!ready ? <p role="status">Opening your bag…</p> : items.length ? <><AnimatePresence>{items.map(p => <motion.div className="cart-row" key={p.id} layout exit={{ opacity: 0, height: 0 }}><img src={`/assets/${p.image}.jpg`} alt={p.name} width={100} height={100} /><div><h3><Link href={`/product/${p.id}`}>{p.name}</Link></h3><p className="muted">{money(p.price)} · Sample price</p></div><div className="quantity"><button aria-label={`Decrease ${p.name} quantity`} onClick={() => change(p.id, -1)}><Minus size={16} /></button><span aria-live="polite">{cart[p.id]}</span><button aria-label={`Increase ${p.name} quantity`} disabled={cart[p.id] >= 99} onClick={() => change(p.id, 1)}><Plus size={16} /></button></div><button aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)}><Trash2 size={17} /></button></motion.div>)}</AnimatePresence><p className="cart-total">Subtotal {money(items.reduce((s, p) => s + p.price * cart[p.id], 0))}</p><p className="muted">Illustrative total. Delivery and taxes are not calculated. No payment will be taken.</p><Link href="/checkout" className="button">Review your selection ↗</Link></> : <div className="empty"><h2>Your next favourite belongs here.</h2><p>Your bag is empty. Explore the collection to find a piece for your space.</p><Link className="button" href="/shop">Explore the collection ↗</Link></div>}</section>;
}

export function WishlistPage() {
  const { wishlist, ready } = useStore();
  const items = products.filter(p => wishlist.includes(p.id));
  return <section className="page"><p className="eyebrow">KEEP A LITTLE INSPIRATION</p><h1>Saved for your space.</h1>{!ready ? <p role="status">Opening your favourites…</p> : items.length ? <ProductGrid items={items} /> : <div className="empty"><p>No saved pieces yet. Tap the heart on any product to keep it here.</p><Link href="/shop" className="button">Explore the collection ↗</Link></div>}</section>;
}

export function CheckoutPage() {
  const { cart, ready } = useStore();
  const total = products.reduce((s, p) => s + p.price * (cart[p.id] || 0), 0);
  return <section className="page article"><p className="eyebrow">YOUR SELECTION</p><h1>A thoughtful next step.</h1>{!ready ? <p role="status">Loading your selection…</p> : total ? <><p>Your sample selection totals <strong>{money(total)}</strong>, before unconfirmed delivery and taxes.</p><p>Online ordering and payments are not connected. No order has been placed. Save your selection as a text file to discuss once business contact details are available.</p><button className="button" onClick={() => downloadText('AfroFurnitures-selection.txt', 'AfroFurnitures — sample selection, not an order\n\n' + products.filter(p => cart[p.id]).map(p => `${p.name} × ${cart[p.id]} — ${money(p.price * cart[p.id])}`).join('\n') + '\n\nSample prices. Availability, delivery and final total require confirmation.')}>Download my selection ↓</button></> : <p>Your bag is empty.</p>}<p><Link className="text-link" href="/cart">Back to your bag</Link></p></section>;
}
