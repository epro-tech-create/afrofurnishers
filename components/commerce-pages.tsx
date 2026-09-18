'use client';

import Link from 'next/link';
import { usePrefs } from './prefs';

export function CartPage() {
  const { t } = usePrefs();
  return (
    <section className="page article">
      <p className="eyebrow">SHOP</p>
      <h1>Order on WhatsApp.</h1>
      <p className="note">Browse our furniture, then message us to buy. All orders go directly to WhatsApp — we do not take payments on this website.</p>
      <div className="buttons">
        <a className="button" href={t.whatsappUrl} target="_blank" rel="noopener noreferrer">{t.ctaButton} →</a>
        <Link className="text-link" href="/shop">{t.workCta} →</Link>
      </div>
    </section>
  );
}

export function WishlistPage() {
  return <CartPage />;
}

export function CheckoutPage() {
  return <CartPage />;
}
