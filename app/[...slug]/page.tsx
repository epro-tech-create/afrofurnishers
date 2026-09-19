import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { products, rooms } from '@/lib/catalog';
import { pages } from '@/lib/pages';
import { Collection, ProductDetail, Shop } from '@/components/products';
import { CartPage, CheckoutPage, WishlistPage } from '@/components/commerce-pages';
import { CustomForm } from '@/components/custom-form';
import { Article, Credits, InformationPage, Journal } from '@/components/editorial';
import { PaletteStudio } from '@/components/palette-studio';

export const dynamicParams = false;
export function generateStaticParams() {
  return [
    ...['shop', 'collections', 'cart', 'wishlist', 'custom', 'checkout', 'inspiration', 'credits', ...Object.keys(pages)].map(name => ({ slug: [name] })),
    ...products.map(p => ({ slug: ['product', p.id] })),
    ...rooms.filter(r => r !== 'All').map(r => ({ slug: ['shop', r] })),
    ...['warmth', 'table'].map(id => ({ slug: ['article', id] })),
  ];
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = products.find(p => p.id === slug[1]);
  const title = slug[0] === 'product' && p ? p.name : slug[0] === 'article' ? (slug[1] === 'table' ? 'Make space for a longer conversation' : 'A warmer way to come home') : slug[0].charAt(0).toUpperCase() + slug[0].slice(1);
  return { title, description: `${title} — AfroFurnishers quality furniture for sale in Dar es Salaam, Tanzania.` };
}
export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug: [page, arg] } = await params;
  if (page === 'shop') return <Shop initialCategory={arg || 'All'} />;
  if (page === 'product') { const p = products.find(p => p.id === arg); if (!p) notFound(); return <section className="page"><p className="muted"><Link href="/shop">Collection</Link> / {p.name}</p><ProductDetail product={p} /></section>; }
  if (page === 'collections') return <><Collection /><PaletteStudio /></>;
  if (page === 'cart') return <CartPage />;
  if (page === 'wishlist') return <WishlistPage />;
  if (page === 'checkout') return <CheckoutPage />;
  if (page === 'custom') return <CustomForm />;
  if (page === 'inspiration') return <Journal />;
  if (page === 'article') return <Article id={arg} />;
  if (page === 'credits') return <Credits />;
  if (pages[page]) return <InformationPage name={page} />;
  notFound();
}
