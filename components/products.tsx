'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, X } from 'lucide-react';
import { money, products, rooms, type Product } from '@/lib/catalog';
import { orderWhatsApp } from '@/lib/whatsapp';
import { Reveal } from './motion';
import { usePrefs } from './prefs';

export function ProductDetail({ product: p, compact = false }: { product: Product; compact?: boolean }) {
  const [zoom, setZoom] = useState(false);
  const { t } = usePrefs();
  return (
    <div className={`detail ${compact ? 'compact' : ''}`}>
      <button
        className={`product-zoom ${zoom ? 'zoomed' : ''}`}
        onClick={() => setZoom(!zoom)}
        aria-label={`${zoom ? 'Zoom out' : 'Zoom in'} on ${p.name}`}
        aria-pressed={zoom}
      >
        <img src={`/assets/${p.image}.jpg`} alt={`${p.name}`} width={900} height={1100} />
        <span>{zoom ? '−' : '+'} Zoom</span>
      </button>
      <div>
        <p className="eyebrow">{t.workBadge}</p>
        {compact ? <h2 id="product-dialog-title">{p.name}</h2> : <h1>{p.name}</h1>}
        <p className="muted">{p.category} · {p.material}</p>
        <p className="showcase-price">{money(p.price)} <span className="muted">· indicative</span></p>
        <p>Furniture from our collection — warm materials and practical shapes for Tanzanian living.</p>
        <p className="note">Browse here, then order on WhatsApp. We do not take online payments on this website.</p>
        <a className="button" href={orderWhatsApp(p.name)} target="_blank" rel="noopener noreferrer">{t.enquire} →</a>
        {compact ? <Link href={`/product/${p.id}`} className="text-link">{t.details} →</Link> : null}
        <details>
          <summary>Materials & size</summary>
          <p>{p.material}<br />{p.dimensions}<br />Colour: {p.color}</p>
        </details>
      </div>
    </div>
  );
}

export function QuickView({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!product) return;
    const dialog = ref.current;
    const focused = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = old;
      focused?.focus();
    };
  }, [product]);
  return (
    <dialog
      ref={ref}
      className="quick-dialog"
      aria-labelledby="product-dialog-title"
      onCancel={onClose}
      onClick={e => {
        if (e.target === ref.current) onClose();
      }}
    >
      <button className="close" aria-label="Close" onClick={onClose}><X size={20} /></button>
      {product && (
        <div onClick={e => { if ((e.target as HTMLElement).closest('a')) onClose(); }}>
          <ProductDetail product={product} compact />
        </div>
      )}
    </dialog>
  );
}

export function ProductCard({ product: p, onQuick }: { product: Product; onQuick: (p: Product) => void }) {
  const { t } = usePrefs();
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
        <span className="badge">{t.workBadge}</span>
        <button className="quick" onClick={() => onQuick(p)}>
          {t.details} <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="product-info">
        <div>
          <h3><Link href={`/product/${p.id}`}>{p.name}</Link></h3>
          <p>{p.category}</p>
        </div>
        <span className="price">{money(p.price)}</span>
      </div>
    </motion.article>
  );
}

export function ProductGrid({ items }: { items: Product[] }) {
  const [quick, setQuick] = useState<Product | null>(null);
  return (
    <>
      <motion.div layout className="products">
        <AnimatePresence mode="popLayout">
          {items.map(p => <ProductCard key={p.id} product={p} onQuick={setQuick} />)}
        </AnimatePresence>
      </motion.div>
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </>
  );
}

export function Collection() {
  const [category, setCategory] = useState('All');
  const { t } = usePrefs();
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
        {['All', 'Living Room', 'Dining Room'].map(c => (
          <button
            key={c}
            className={c === category ? 'active' : ''}
            aria-pressed={c === category}
            onClick={() => setCategory(c)}
          >
            {category === c && (
              <motion.span className="tab-pill" layoutId="collection-pill" transition={{ type: 'spring', stiffness: 350, damping: 30 }} />
            )}
            <span>{c === 'All' ? 'All' : c}</span>
          </button>
        ))}
      </div>
      <ProductGrid items={products.filter(p => category === 'All' || p.category === category)} />
    </section>
  );
}

export function Shop({ initialCategory = 'All' }: { initialCategory?: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState('featured');
  const { t } = usePrefs();
  const filtered = products.filter(
    p =>
      (category === 'All' || p.category === category) &&
      `${p.name} ${p.category} ${p.color}`.toLowerCase().includes(query.toLowerCase()),
  );
  if (sort !== 'featured') filtered.sort((a, b) => (sort === 'low' ? a.price - b.price : b.price - a.price));

  return (
    <section className="page">
      <p className="eyebrow">{t.workEyebrow}</p>
      <h1>{t.workTitle}</h1>
      <p>{t.workLead}</p>
      <p className="note">Browse only — contact us to buy. No online checkout.</p>
      <div className="filterbar">
        <input
          id="search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          aria-label="Search"
        />
        <select aria-label="Filter by room" value={category} onChange={e => setCategory(e.target.value)}>
          {rooms.map(c => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="featured">Featured</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
      </div>
      <p className="muted" aria-live="polite">{filtered.length} items</p>
      {filtered.length ? (
        <ProductGrid items={filtered} />
      ) : (
        <div className="empty">
          <h2>No matches</h2>
          <a className="button" href={t.whatsappUrl} target="_blank" rel="noopener noreferrer">{t.enquire} →</a>
        </div>
      )}
    </section>
  );
}

export function ShopRoom() {
  const [quick, setQuick] = useState<Product | null>(null);
  return (
    <>
      <div className="room">
        <img src="/assets/hero.jpg" alt="Living room setting" width={1600} height={1000} loading="lazy" />
        <button className="hotspot" onClick={() => setQuick(products[0])} aria-label="Explore Masaki sofa">
          +
        </button>
        <div className="room-caption">
          <p className="eyebrow">TAP +</p>
          <p>Masaki sofa — available to enquire</p>
        </div>
      </div>
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </>
  );
}
