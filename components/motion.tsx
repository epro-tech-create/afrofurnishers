'use client';

import { motion, AnimatePresence, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePrefs } from './prefs';

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 40 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function FadeUp({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 32 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 130, damping: 32 });
  return <motion.div aria-hidden className="scroll-progress" style={{ scaleX }} />;
}

export function MagneticLink({ children, href, className = 'button' }: { children: ReactNode; href: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(0, { stiffness: 240, damping: 18 });
  const y = useSpring(0, { stiffness: 240, damping: 18 });
  const external = href.startsWith('http');
  return (
    <motion.div
      className="magnetic-wrap"
      ref={ref}
      style={{ x, y }}
      whileHover={reduced ? undefined : { scale: 1.03 }}
      onPointerMove={e => {
        if (reduced || e.pointerType !== 'mouse') return;
        const box = ref.current?.getBoundingClientRect();
        if (box) {
          x.set((e.clientX - box.left - box.width / 2) * 0.12);
          y.set((e.clientY - box.top - box.height / 2) * 0.2);
        }
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {external ? (
        <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>
      ) : (
        <Link className={className} href={href}>{children}</Link>
      )}
    </motion.div>
  );
}

const reel = ['/assets/hero.jpg', '/assets/dining.jpg', '/assets/sofa.jpg'];

function HeroReel({ reduced }: { reduced: boolean | null }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setIndex(i => (i + 1) % reel.length), 7000);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <div className="hero-reel" aria-hidden>
      <AnimatePresence mode="sync">
        <motion.img
          key={reel[index]}
          src={reel[index]}
          alt=""
          className="hero-reel-frame"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1.18 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.2 }, scale: { duration: 7, ease: 'linear' } }}
        />
      </AnimatePresence>
      <div className="hero-reel-veil" />
    </div>
  );
}

export function Hero() {
  const { t } = usePrefs();
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section className="hero-minimal" ref={ref}>
      <motion.div className="hero-minimal-media" style={{ y: reduced ? 0 : imageY }} aria-hidden>
        <HeroReel reduced={reduced} />
      </motion.div>

      <motion.div className="hero-minimal-copy" style={{ y: reduced ? 0 : copyY, opacity: reduced ? 1 : fade }}>
        <motion.p
          className="hero-brand"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          Afro<span>Furnitures</span>
        </motion.p>
        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          Quality furniture<br />for modern living.
        </motion.h1>
        <motion.p
          className="hero-lead"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          {t.heroLead}
        </motion.p>
        <motion.div
          className="buttons"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.65 }}
        >
          <MagneticLink href="/shop" className="button">{t.heroCta}</MagneticLink>
          <a className="text-link light-link" href={t.whatsappUrl} target="_blank" rel="noopener noreferrer">{t.heroSecondary}</a>
        </motion.div>
      </motion.div>

      <motion.div
        className="hero-minimal-line"
        aria-hidden
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </section>
  );
}

export function TestimonialsStage() {
  const { t } = usePrefs();
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const item = t.testimonials[index];

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setIndex(i => (i + 1) % t.testimonials.length), 6500);
    return () => clearInterval(id);
  }, [reduced, t.testimonials.length]);

  const prev = () => setIndex(i => (i - 1 + t.testimonials.length) % t.testimonials.length);
  const next = () => setIndex(i => (i + 1) % t.testimonials.length);

  return (
    <section className="section soft voice-section">
      <Reveal>
        <div className="section-heading centre">
          <div>
            <p className="eyebrow">{t.testimonialsEyebrow}</p>
            <h2>{t.testimonialsTitle}</h2>
          </div>
        </div>

        <div className="voice-stage">
          <div className="voice-rail" aria-hidden>
            {t.testimonials.map((_, i) => (
              <button key={i} type="button" className={`voice-dot ${i === index ? 'active' : ''}`} onClick={() => setIndex(i)} aria-label={`Show comment ${i + 1}`} />
            ))}
          </div>

          <div className="voice-main">
            <p className="voice-mark" aria-hidden>“</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={item.name}
                className="voice-body"
                initial={reduced ? false : { opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? undefined : { opacity: 0, x: -30 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="voice-quote">{item.quote}</p>
                <div className="voice-person">
                  <span className="voice-avatar">{item.initials}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <p className="muted">{item.role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="voice-controls">
              <button type="button" className="voice-nav" onClick={prev} aria-label="Previous comment"><ChevronLeft size={20} /></button>
              <span className="voice-index">0{index + 1} / 0{t.testimonials.length}</span>
              <button type="button" className="voice-nav" onClick={next} aria-label="Next comment"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="voice-stack">
            {t.testimonials.map((entry, i) => (
              <button
                key={entry.name}
                type="button"
                className={`voice-chip ${i === index ? 'active' : ''}`}
                onClick={() => setIndex(i)}
              >
                <span className="voice-avatar sm">{entry.initials}</span>
                <span>
                  <strong>{entry.name}</strong>
                  <small>{entry.role}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
