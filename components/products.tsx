'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Heart, Minus, Plus, ShoppingBag } from 'lucide-react';
import { money, rooms } from '@/lib/catalog';
import type { ProductFull } from '@/lib/shop-types';
import { Reveal } from './motion';
import { usePrefs } from './prefs';
import { useStore } from './store';

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <span className="badge badge-out">Out of stock</span>;
  if (stock <= 5) return <span className="badge badge-low">Only {stock} left</span>;
  return <span className="badge">For sale</span>;
}

export function ProductDetail({ product: p, compact = false }: { product: ProductFull; compact?: boolean }) {
  const { t } = usePrefs();
  const { add, setCartOpen, toggle, wishlist } = useStore();
  const [qty, setQty] = useState(1);
  const wished = wishlist.includes(p.id);
  const out = p.stock <= 0;

  return (
    <div className={`detail ${compact ? 'compact' : ''}`}>
      <div className="product-zoom-wrap">
        <img src={`/assets/${p.image}.jpg`} alt={p.name} width={900} height={1100} className="detail-img" />
        <StockBadge stock={p.stock} />
      </div>
      <div>
        <p className="eyebrow">{p.category}</p>
        {compact ? <h2 id="product-dialog-title">{p.name}</h2> : <h1>{p.name}</h1>}
        <p className="muted">{p.material} · {p.dimensions} · {p.color}</p>
        <p className="showcase-price">
          {money(p.price)}{' '}
          {p.oldPrice && p.oldPrice > p.price && <s className="muted">{money(p.oldPrice)}</s>}
        </p>
        <p>{p.description || 'Quality furniture from our Dar es Salaam collection.'}</p>
        <div className="buy-row">
          <div className="qty qty-lg">
            <button aria-label="Decrease quantity" onClick={() => setQty(q => Math.max(1, q - 1))}><Minus size={15} /></button>
            <span>{qty}</span>
            <button aria-label="Increase quantity" onClick={() => setQty(q => Math.min(p.stock || 99, q + 1))}><Plus size={15} /></button>
          </div>
          <button
            className="button buy-main"
            disabled={out}
            onClick={() => { add(p.id, qty); setCartOpen(true); }}
          >
            <ShoppingBag size={16} /> {out ? 'Out of stock' : 'Add to bag'}
          </button>
          <button
            className={`icon-btn wishlist-btn ${wished ? 'active' : ''}`}
            aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
            aria-pressed={wished}
            onClick={() => toggle(p.id)}
          >
            <Heart size={17} fill={wished ? 'currentColor' : 'none'} />
          </button>
        </div>
        <p className="note">Pay with M-Pesa or cash. Sign in at checkout to track your order across Dar es Salaam and Tanzania.</p>
        {compact ? <div className="buttons buy-alt"><Link href={`/product/${p.id}`} className="text-link">{t.details} →</Link></div> : null}
        <details>
          <summary>Materials & size</summary>
          <p>{p.material}<br />{p.dimensions}<br />Colour: {p.color}<br />In stock: {p.stock}</p>
        </details>
      </div>
    </div>
  );
}

export function ProductCard({ product: p, onQuick }: { product: ProductFull; onQuick: (p: ProductFull) => void }) {
  const { t } = usePrefs();
  const { add, toggle, wishlist } = useStore();
  const wished = wishlist.includes(p.id);
  const out = p.stock <= 0;

  return (
    <motion.article
      className="product"
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -6 }}
    >
      <div className="product-image">
        <Link href={`/product/${p.id}`}>
          <img src={`/assets/${p.image}.jpg`} alt={p.name} width={650} height={750} loading="lazy" />
        </Link>
        <StockBadge stock={p.stock} />
        <button className={`heart ${wished ? 'active' : ''}`} aria-label="Save to wishlist" aria-pressed={wished} onClick={() => toggle(p.id)}>
          <Heart size={15} fill={wished ? 'currentColor' : 'none'} />
        </button>
        <div className="product-actions">
          <button className="quick" onClick={() => onQuick(p)}>
            {t.details} <ArrowUpRight size={15} />
          </button>
          <button className="quick quick-add" disabled={out} onClick={() => add(p.id)}>
            <ShoppingBag size={14} /> {out ? 'Sold out' : 'Add'}
          </button>
        </div>
      </div>
      <div className="product-info">
        <div>
          <h3><Link href={`/product/${p.id}`}>{p.name}</Link></h3>
          <p>{p.category} · {p.color}</p>
        </div>
        <span className="price">{money(p.price)}</span>
      </div>
    </motion.article>
  );
}

export function ProductGrid({ items }: { items: ProductFull[] }) {
  const [quick, setQuick] = useState<ProductFull | null>(null);
  return (
    <>
      <motion.div layout className="products">
        <AnimatePresence mode="popLayout">
          {items.map(p => <ProductCard key={p.id} product={p} onQuick={setQuick} />)}
        </AnimatePresence>
      </motion.div>
      {quick && (
        <div className="quick-overlay" onClick={() => setQuick(null)}>
          <div className="quick-sheet" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={quick.name}>
            <button className="close" aria-label="Close" onClick={() => setQuick(null)}>✕</button>
            <ProductDetail product={quick} compact />
          </div>
        </div>
      )}
    </>
  );
}

export function Collection() {
  const [category, setCategory] = useState('All');
  const { t } = usePrefs();
  const { products } = useStore();
  const items = useMemo(
    () => products.filter(p => p.active && (category === 'All' || p.category === category)).slice(0, 6),
    [products, category],
  );
  return (
    <section className="section signature" id="collection">
      <Reveal className="section-heading">
        <div>
          <p className="eyebrow">{t.workEyebrow}</p>
          <h2>{t.workTitle}</h2>
        </div>
        <Link className="text-link" href="/shop">{t.workCta} →</Link>
      </Reveal>
      <p className="section-lead">{t.workLead}</p>
      <div className="tabs" aria-label="Work categories">
        {['All', 'Living Room', 'Dining Room', 'Bedroom', 'Office'].map(c => (
          <button key={c} className={c === category ? 'active' : ''} aria-pressed={c === category} onClick={() => setCategory(c)}>
            {category === c && <motion.span className="tab-pill" layoutId="collection-pill" transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}
            <span>{c}</span>
          </button>
        ))}
      </div>
      <ProductGrid items={items} />
    </section>
  );
}

export function Shop({ initialCategory = 'All' }: { initialCategory?: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const { t } = usePrefs();
  const { products, productsReady } = useStore();

  const filtered = useMemo(() => {
    const list = products.filter(
      p =>
        p.active &&
        (category === 'All' || p.category === category) &&
        (!inStockOnly || p.stock > 0) &&
        `${p.name} ${p.category} ${p.color} ${p.material}`.toLowerCase().includes(query.toLowerCase()),
    );
    if (sort === 'low') list.sort((a, b) => a.price - b.price);
    else if (sort === 'high') list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => Number(b.featured || false) - Number(a.featured || false));
    return list;
  }, [products, category, query, sort, inStockOnly]);

  return (
    <section className="page">
      <p className="eyebrow">{t.workEyebrow}</p>
      <h1>{t.workTitle}</h1>
      <p>{t.workLead} Pay with M-Pesa or Cash on Delivery.</p>
      <div className="filterbar">
        <input id="search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sofas, beds, desks…" aria-label="Search" />
        <select aria-label="Filter by room" value={category} onChange={e => setCategory(e.target.value)}>
          {rooms.map(c => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="featured">Featured</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
        <label className="check"><input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} /> In stock only</label>
      </div>
      <p className="muted" aria-live="polite">{productsReady ? `${filtered.length} items` : 'Loading…'}</p>
      {filtered.length ? (
        <ProductGrid items={filtered} />
      ) : (
        <div className="empty">
          <h2>No matches</h2>
          <p className="muted">Try a different search, or ask us for a custom piece.</p>
          <Link className="button" href="/custom">Custom piece →</Link>
        </div>
      )}
    </section>
  );
}
