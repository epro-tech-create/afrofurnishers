'use client';

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import Link from 'next/link';

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={false} whileInView={reduced ? {} : { y: [24, 0], opacity: [0.3, 1] }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return <motion.div aria-hidden className="scroll-progress" style={{ scaleX }} />;
}

export function MagneticLink({ children, href, className = 'button' }: { children: ReactNode; href: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 20 });
  const y = useSpring(0, { stiffness: 220, damping: 20 });
  return <motion.div className="magnetic-wrap" ref={ref} style={{ x, y }} onPointerMove={e => {
    if (reduced || e.pointerType !== 'mouse') return;
    const box = ref.current?.getBoundingClientRect();
    if (box) { x.set((e.clientX - box.left - box.width / 2) * 0.1); y.set((e.clientY - box.top - box.height / 2) * 0.18); }
  }} onPointerLeave={() => { x.set(0); y.set(0); }}><Link className={className} href={href}>{children}</Link></motion.div>;
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  return <section className="hero" ref={ref}>
    <motion.img src="/assets/hero.jpg" alt="Warm orange sofa in a light-filled living room" fetchPriority="high" width={1920} height={1280} style={{ y: reduced ? 0 : y }} initial={false} animate={reduced ? {} : { scale: [1.07, 1] }} transition={{ duration: 1.8, ease: 'easeOut' }} />
    <div className="hero-copy"><p className="eyebrow hero-enter">CONTEMPORARY DESIGN. AFRICAN SOUL.</p><h1><span className="line-mask"><span>Furniture that</span></span><span className="line-mask"><span>feels like <em>home.</em></span></span></h1><p className="hero-enter hero-delay">Thoughtful pieces. Natural warmth.<br />For the everyday moments that matter.</p><div className="buttons hero-enter hero-delay"><MagneticLink href="/shop">Explore the collection <span>↗</span></MagneticLink><Link className="text-link" href="/custom">Design your own ↗</Link></div></div>
    <div className="hero-bottom"><span className="scroll-cue">SCROLL TO FEEL AT HOME <span>↓</span></span><Link className="hero-tag" href="/collections">MEET THE DAR COLLECTION<br /><strong>A little warmth. A lot of character. ↗</strong></Link></div>
    <div className="hero-coordinate" aria-hidden>06°48′ S · 39°17′ E</div>
  </section>;
}
