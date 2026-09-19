'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { MotionConfig, motion, AnimatePresence } from 'motion/react';
import { Menu, X, ArrowUpRight, Sun, Moon } from 'lucide-react';
import { PrefsProvider, usePrefs } from './prefs';
import { ScrollProgress } from './motion';

function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t, theme, toggleTheme } = usePrefs();

  return (
    <header>
      <Link className="brand" href="/" aria-label="AfroFurnitures" onClick={() => setOpen(false)}>
        <span className="brand-mark" aria-hidden />
        <span aria-hidden="true">Afro<span className="brand-accent">Furnitures</span></span>
      </Link>
      <nav id="primary-nav" className={open ? 'open' : ''} aria-label="Main navigation">
        {t.nav.map(([href, name]) => {
          const external = href.startsWith('http');
          const current = !external && (href === '/'
            ? pathname === '/' || pathname === ''
            : pathname === href || pathname === href + '/');
          if (external) {
            return (
              <a
                key={href + name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                {name}
              </a>
            );
          }
          return (
            <Link
              key={href + name}
              href={href}
              aria-current={current && !href.includes('#') ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {name}
            </Link>
          );
        })}
      </nav>
      <div className="tools">
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={theme === 'light' ? t.themeDark : t.themeLight}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ opacity: 0, rotate: -30, scale: 0.85 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 30, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'grid' }}
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </motion.span>
          </AnimatePresence>
        </button>
        <a className="button button-sm header-cta" href={t.whatsappUrl} target="_blank" rel="noopener noreferrer">{t.heroSecondary}</a>
        <button className="mobile-menu" aria-label="Toggle navigation" aria-controls="primary-nav" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = usePrefs();
  return (
    <footer>
      <div className="footer-top">
        <div>
          <p className="eyebrow">{t.ctaEyebrow}</p>
          <h2>{t.ctaTitle}</h2>
          <p className="footer-lead">{t.footerLead}</p>
          <a className="button" href={t.whatsappUrl} target="_blank" rel="noopener noreferrer">{t.footerTalk} <ArrowUpRight size={17} /></a>
        </div>
        <div>
          <p>{t.footerExplore}</p>
          <Link href="/shop">{t.nav[1][1]}</Link>
          <Link href="/#rooms">{t.nav[2][1]}</Link>
          <Link href="/story">{t.nav[3][1]}</Link>
          <a href={t.whatsappUrl} target="_blank" rel="noopener noreferrer">{t.nav[4][1]}</a>
        </div>
        <div>
          <p>{t.footerInfo}</p>
          <Link href="/care">Care</Link>
          <Link href="/delivery">Delivery</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/credits">Credits</Link>
        </div>
      </div>
      <div className="footer-brand">AfroFurnitures</div>
      <div className="footer-bottom">
        <span>{t.footerCopy}</span>
        <span>
          Developed by{' '}
          <a href="https://github.com/epro-tech-create" target="_blank" rel="noopener noreferrer">
            eproTech
          </a>
        </span>
      </div>
    </footer>
  );
}

function LegacyLinks() {
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const route = hash.split('/')[0];
    if (['home', 'shop', 'collections', 'product', 'cart', 'wishlist', 'custom', 'story', 'contact', 'care', 'delivery', 'privacy', 'credits', 'inspiration', 'article', 'checkout'].includes(route)) {
      router.replace(route === 'home' ? '/' : '/' + hash);
    }
  }, [router]);
  return null;
}

function ShellSkip() {
  const { t } = usePrefs();
  return <a className="skip" href="#main">{t.skip}</a>;
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <PrefsProvider>
        <LegacyLinks />
        <ScrollProgress />
        <ShellSkip />
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
      </PrefsProvider>
    </MotionConfig>
  );
}
