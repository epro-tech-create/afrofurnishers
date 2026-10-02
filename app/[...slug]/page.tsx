import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDB } from '@/lib/db';
import { pages } from '@/lib/pages';
import { Collection, ProductDetail, Shop } from '@/components/products';
import { AccountPage, CartPage, CheckoutPage, OrderTrackPage, OrdersDashboardPage, WishlistPage } from '@/components/commerce-pages';
import { CustomForm } from '@/components/custom-form';
import { Article, Credits, InformationPage, Journal } from '@/components/editorial';
import { PaletteStudio } from '@/components/palette-studio';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const [page, arg] = slug || [];
  if (page === 'product' && arg) {
    try {
      const db = await readDB();
      const p = db.products.find(p => p.id === arg);
      if (p) return { title: p.name, description: `${p.name}: ${p.description} Buy online in Dar es Salaam.` };
    } catch { /* fallback */ }
  }
  if (page === 'article') return { title: arg === 'table' ? 'Make space for a longer conversation' : 'A warmer way to come home', description: 'AfroFurnishers ideas.' };
  const title = page ? page.charAt(0).toUpperCase() + page.slice(1) : 'Home';
  return { title, description: `${title}: AfroFurnishers quality furniture for sale in Dar es Salaam, Tanzania. Order online with M-Pesa or Cash on Delivery.` };
}

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const [page, arg] = slug || [];
  if (page === 'shop') return <Shop initialCategory={arg ? decodeURIComponent(arg) : 'All'} />;
  if (page === 'product' && arg) {
    const db = await readDB();
    const p = db.products.find(p => p.id === arg && p.active);
    if (!p) notFound();
    return <section className="page"><p className="muted"><Link href="/shop">Shop</Link> / {p.name}</p><ProductDetail product={p} /></section>;
  }
  if (page === 'collections') return <><Collection /><PaletteStudio /></>;
  if (page === 'cart') return <CartPage />;
  if (page === 'wishlist') return <WishlistPage />;
  if (page === 'checkout') return <CheckoutPage />;
  if (page === 'track') return <OrderTrackPage initialId={arg ? decodeURIComponent(arg) : ''} />;
  if (page === 'order' && arg) return <OrderTrackPage initialId={decodeURIComponent(arg)} />;
  if (page === 'orders') return <OrdersDashboardPage />;
  if (page === 'account') return <AccountPage />;
  if (page === 'custom') return <CustomForm />;
  if (page === 'inspiration') return <Journal />;
  if (page === 'article') return <Article id={arg} />;
  if (page === 'credits') return <Credits />;
  if (page && pages[page]) return <InformationPage name={page} />;
  notFound();
}
