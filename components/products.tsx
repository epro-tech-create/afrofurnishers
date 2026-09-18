'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Heart, Plus, X } from 'lucide-react';
import { money, products, rooms, type Product } from '@/lib/catalog';
import { useStore } from './store';
import { Reveal } from './motion';

export function ProductDetail({ product: p, compact = false }: { product: Product; compact?: boolean }) {
  const { add } = useStore();
  const [zoom, setZoom] = useState(false);
  return <div className={`detail ${compact ? 'compact' : ''}`}><button className={`product-zoom ${zoom ? 'zoomed' : ''}`} onClick={() => setZoom(!zoom)} aria-label={`${zoom ? 'Zoom out' : 'Zoom in'} on ${p.name}`} aria-pressed={zoom}><img src={`/assets/${p.image}.jpg`} alt={`${p.name} inspiration photograph`} width={900} height={1100} /><span>{zoom ? '−' : '+'} A closer look</span></button><div><p className="eyebrow">DAR COLLECTION · SAMPLE DESIGN</p>{compact ? <h2 id="product-dialog-title">{p.name}</h2> : <h1>{p.name}</h1>}<p>{money(p.price)} <span className="muted">· Sample price</span></p><p>A little character for your everyday. This concept brings a warm material palette and an inviting silhouette into a contemporary home.</p><p className="muted">Illustrative stock photography. Final design, specification, price and availability require confirmation.</p><label>Proposed colour<select><option>{p.color}</option></select></label><button className="button" onClick={() => add(p.id)}>Add to bag <Plus size={17} /></button>{compact ? <Link href={`/product/${p.id}`} className="text-link">See every detail ↗</Link> : <Link href="/custom" className="text-link">Make it personal ↗</Link>}<details><summary>Materials & dimensions</summary><p>{p.material}<br />{p.dimensions}<br />Indicative specification only.</p></details><details><summary>Delivery & assembly</summary><p>Delivery area, timing and assembly requirements must be agreed before an order. No delivery charge has been calculated.</p></details><details><summary>Care for your piece</summary><p>Dust gently with a soft cloth. Blot spills promptly. Keep away from direct sunlight and confirm material-specific care before using cleaning products.</p></details></div></div>;
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
    return () => { dialog?.close(); document.body.style.overflow = old; focused?.focus(); };
  }, [product]);
  return <dialog ref={ref} className="quick-dialog" aria-labelledby="product-dialog-title" onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}><button className="close" aria-label="Close product details" onClick={onClose}><X size={20} /></button>{product && <div onClick={e => { if ((e.target as HTMLElement).closest('a')) onClose(); }}><ProductDetail product={product} compact /></div>}</dialog>;
}

export function ProductCard({ product: p, onQuick }: { product: Product; onQuick: (p: Product) => void }) {
  const { wishlist, toggle } = useStore();
  const saved = wishlist.includes(p.id);
  return <motion.article className="product" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.35 }}><div className="product-image"><Link href={`/product/${p.id}`}><img src={`/assets/${p.image}.jpg`} alt={`${p.name} — illustrative stock photograph`} width={650} height={750} loading="lazy" /></Link><span className="badge">DAR COLLECTION</span><motion.button className="wish" whileTap={{ scale: 0.82 }} onClick={() => toggle(p.id)} aria-label={`Save ${p.name}`} aria-pressed={saved}><Heart size={19} fill={saved ? 'currentColor' : 'none'} /></motion.button><button className="quick" onClick={() => onQuick(p)}>Quick view <ArrowUpRight size={15} /></button></div><div className="product-info"><div><h3><Link href={`/product/${p.id}`}>{p.name}</Link></h3><p>{p.category} · Sample design</p><div className="swatches" aria-label="Illustrative colour palette"><i /><i /><i /></div></div><span className="price">{money(p.price)}</span></div></motion.article>;
}

export function ProductGrid({ items }: { items: Product[] }) {
  const [quick, setQuick] = useState<Product | null>(null);
  return <><motion.div layout className="products"><AnimatePresence mode="popLayout">{items.map(p => <ProductCard key={p.id} product={p} onQuick={setQuick} />)}</AnimatePresence></motion.div><QuickView product={quick} onClose={() => setQuick(null)} /></>;
}

export function Collection() {
  const [category, setCategory] = useState('All');
  return <section className="section signature" id="collection"><Reveal className="section-heading"><div><p className="eyebrow">THE DAR COLLECTION / 01</p><h2>Everyday pieces.<br />Extraordinary feeling.</h2></div><Link className="text-link" href="/shop">View the collection ↗</Link></Reveal><div className="tabs" aria-label="Collection categories">{['All', 'Living Room', 'Dining Room'].map(c => <button key={c} className={c === category ? 'active' : ''} aria-pressed={c === category} onClick={() => setCategory(c)}>{category === c && <motion.span className="tab-pill" layoutId="collection-pill" transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}<span>{c === 'All' ? 'All pieces' : c}</span></button>)}</div><ProductGrid items={products.filter(p => category === 'All' || p.category === category)} /><p className="muted">Concept collection · Illustrative photography and sample prices. Availability to be confirmed.</p></section>;
}

export function Shop({ initialCategory = 'All' }: { initialCategory?: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState('featured');
  const [material, setMaterial] = useState('All');
  const filtered = products.filter(p => (category === 'All' || p.category === category) && (material === 'All' || p.material.toLowerCase().includes(material)) && `${p.name} ${p.category} ${p.color}`.toLowerCase().includes(query.toLowerCase()));
  if (sort !== 'featured') filtered.sort((a, b) => sort === 'low' ? a.price - b.price : b.price - a.price);
  return <section className="page"><p className="eyebrow">FIND YOUR EVERYDAY FAVOURITE</p><h1>The collection.</h1><p>Thoughtful shapes. Warm materials. A place in your story.</p><p className="muted">Sample catalogue · Prices, dimensions, materials and photography are illustrative, not confirmed inventory.</p><div className="filterbar"><input id="search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find something for your space…" aria-label="Search products" /><select aria-label="Filter by room" value={category} onChange={e => setCategory(e.target.value)}>{rooms.map(c => <option key={c}>{c}</option>)}</select><select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><select aria-label="Filter by material" value={material} onChange={e => setMaterial(e.target.value)}><option value="All">All materials</option><option value="wood">Wood</option><option value="upholstery">Upholstery</option></select></div><p className="muted" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}</p>{filtered.length ? <ProductGrid items={filtered} /> : <div className="empty"><h2>Room for something new.</h2><p>No matching pieces in our sample collection yet. Try another filter, or tell us about your idea.</p><button className="button" onClick={() => { setQuery(''); setCategory('All'); setMaterial('All'); }}>Reset filters ↗</button> <Link className="text-link" href="/custom">Design your own ↗</Link></div>}</section>;
}

export function ShopRoom() {
  const [quick, setQuick] = useState<Product | null>(null);
  return <><div className="room"><img src="/assets/hero.jpg" alt="A complete living-room inspiration setting" width={1600} height={1000} loading="lazy" /><button className="hotspot" onClick={() => setQuick(products[0])} aria-label="Explore the Masaki sofa concept"><Plus size={20} /></button><div className="room-caption"><p className="eyebrow">SHOP THE ROOM</p><p>The art of a slower afternoon. ↗</p></div></div><QuickView product={quick} onClose={() => setQuick(null)} /></>;
}
