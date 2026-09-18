'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Heart, Search, Menu, X, ArrowUpRight } from 'lucide-react';
import { StoreProvider, useStore } from './store';
import { ScrollProgress } from './motion';

function Header() {
  const { cart } = useStore();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = [['/shop', 'Shop'], ['/collections', 'Collections'], ['/custom', 'Custom furniture'], ['/story', 'Our story'], ['/inspiration', 'Afro Living']];
  return <><div className="announcement">ROOTED IN AFRICA. MADE FOR LIVING.<span>DAR ES SALAAM, TANZANIA ↗</span></div><header><Link className="brand" href="/" onClick={() => setOpen(false)}>afro<span>furnitures</span><i>®</i></Link><nav id="primary-nav" className={open ? 'open' : ''} aria-label="Main navigation">{links.map(([href, name]) => <Link key={href} href={href} aria-current={pathname === href + '/' || pathname === href ? 'page' : undefined} onClick={() => setOpen(false)}>{name}</Link>)}</nav><div className="tools"><Link className="icon-link" href="/shop#search" aria-label="Search furniture"><Search size={19} /></Link><Link className="icon-link" href="/wishlist" aria-label="Wishlist"><Heart size={20} /></Link><Link className="bag" href="/cart" aria-label="Shopping bag">Bag <motion.b key={Object.values(cart).reduce((a, b) => a + b, 0)} initial={false} animate={{ scale: [1, 1.22, 1] }}>{Object.values(cart).reduce((a, b) => a + b, 0)}</motion.b></Link><button className="mobile-menu" aria-label="Toggle navigation" aria-controls="primary-nav" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={21} />}</button></div></header></>;
}
function Footer() {
  return <footer><div className="footer-top"><div><p className="eyebrow">A LITTLE CLOSER TO HOME</p><h2>Good living starts<br />with a conversation.</h2><Link className="button light" href="/contact">Let’s talk about your space <ArrowUpRight size={17} /></Link></div><div><p>EXPLORE</p><Link href="/shop">The collection</Link><Link href="/custom">Made for you</Link><Link href="/story">Our story</Link><Link href="/contact">Contact & showroom</Link></div><div><p>THE DETAILS</p><Link href="/care">Furniture care</Link><Link href="/delivery">Delivery & returns</Link><Link href="/privacy">Privacy & terms</Link><Link href="/credits">Photography credits</Link></div></div><div className="footer-brand">afrofurnitures<span>®</span></div><div className="footer-bottom"><span>© 2026 AfroFurnitures. Crafted for the way you live.</span><span>Dar es Salaam, Tanzania · EN</span></div></footer>;
}
function LegacyLinks() {
  const router = useRouter();
  useEffect(() => { const hash = window.location.hash.slice(1); const route = hash.split('/')[0]; if (['home', 'shop', 'collections', 'product', 'cart', 'wishlist', 'custom', 'story', 'contact', 'care', 'delivery', 'privacy', 'credits', 'inspiration', 'article', 'checkout'].includes(route)) router.replace(route === 'home' ? '/' : '/' + hash); }, [router]);
  return null;
}
export function Shell({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user"><StoreProvider><LegacyLinks /><ScrollProgress /><a className="skip" href="#main">Skip to content</a><Header /><main id="main" tabIndex={-1}>{children}</main><Footer /></StoreProvider></MotionConfig>;
}
