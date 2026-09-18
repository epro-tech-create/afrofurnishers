'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, CheckCircle2, Target, Eye, Shield, Heart, Handshake, Award, Home } from 'lucide-react';
import { Hero, Reveal, FadeUp, TestimonialsStage, MagneticLink } from '@/components/motion';
import { ClientsMarquee } from '@/components/clients-marquee';
import { usePrefs } from '@/components/prefs';

export function HomePage() {
  const { t } = usePrefs();

  return (
    <>
      <Hero />

      <section className="section minimal-statement">
        <Reveal>
          <p className="eyebrow">{t.annLeft}</p>
          <h2>Furniture for homes and organisations</h2>
          <span className="statement-rule" aria-hidden />
          <p className="statement-sub">hospitals, schools, offices and more.</p>
        </Reveal>
      </section>

      <ClientsMarquee />

      <section className="section soft featured-piece">
        <Reveal>
          <div className="featured-layout">
            <FadeUp className="featured-media">
              <img src="/assets/sofa.jpg" alt="Signature living room sofa" width={1100} height={900} loading="lazy" />
            </FadeUp>
            <div className="featured-copy">
              <p className="eyebrow">{t.workEyebrow}</p>
              <h2>{t.dropTitle}</h2>
              <p>{t.dropLead}</p>
              <div className="featured-meta">
                <span>Living room</span>
                <span>Order now</span>
              </div>
              <a className="button" href={t.whatsappUrl} target="_blank" rel="noopener noreferrer">{t.enquire} <ArrowUpRight size={16} /></a>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section" id="rooms">
        <Reveal>
          <div className="section-heading centre">
            <div>
              <p className="eyebrow">{t.roomsEyebrow}</p>
              <h2>{t.roomsTitle}</h2>
            </div>
          </div>
          <div className="rooms-minimal">
            {[
              { href: '/shop/Living%20Room', img: '/assets/hero.jpg', title: t.living, sub: t.livingSub, external: false },
              { href: '/shop/Dining%20Room', img: '/assets/dining.jpg', title: t.dining, sub: t.diningSub, external: false },
              { href: t.whatsappUrl, img: '/assets/sofa.jpg', title: t.custom, sub: t.customSub, external: true },
            ].map((room, i) => (
              <FadeUp key={room.href} delay={i * 0.1}>
                {room.external ? (
                  <a className="room-tile" href={room.href} target="_blank" rel="noopener noreferrer">
                    <span className="room-tile-media">
                      <img src={room.img} alt="" width={900} height={1100} loading="lazy" />
                    </span>
                    <span className="room-tile-copy">
                      <strong>{room.title}</strong>
                      <small>{room.sub}</small>
                    </span>
                  </a>
                ) : (
                  <Link className="room-tile" href={room.href}>
                    <span className="room-tile-media">
                      <img src={room.img} alt="" width={900} height={1100} loading="lazy" />
                    </span>
                    <span className="room-tile-copy">
                      <strong>{room.title}</strong>
                      <small>{room.sub}</small>
                    </span>
                  </Link>
                )}
              </FadeUp>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="section soft" id="how">
        <Reveal>
          <div className="section-heading centre">
            <div>
              <p className="eyebrow">{t.howEyebrow}</p>
              <h2>{t.howTitle}</h2>
            </div>
          </div>
          <div className="how-minimal">
            {t.how.map((step, i) => (
              <FadeUp key={step.title} delay={i * 0.12} className="how-line">
                <span className="how-index">0{i + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="section" id="mission">
        <Reveal>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.mvEyebrow}</p>
              <h2>{t.mvTitle}</h2>
            </div>
            <p>{t.whyLead}</p>
          </div>
          <div className="mv-grid mv-grid-rich">
            <motion.article className="mv-card mv-photo" whileHover={{ y: -6 }} transition={{ duration: 0.25 }}>
              <img src="/assets/dining.jpg" alt="Furniture showroom feel" width={800} height={600} loading="lazy" />
              <div className="mv-photo-copy">
                <span className="mv-icon"><Target size={22} /></span>
                <p className="eyebrow">{t.missionLabel}</p>
                <p>{t.mission}</p>
              </div>
            </motion.article>
            <motion.article className="mv-card mv-vision" whileHover={{ y: -6 }} transition={{ duration: 0.25 }}>
              <span className="mv-icon"><Eye size={22} /></span>
              <p className="eyebrow">{t.visionLabel}</p>
              <p>{t.vision}</p>
              <ul className="mv-points">
                <li><Handshake size={16} /> Honest service</li>
                <li><Award size={16} /> Quality products</li>
                <li><Home size={16} /> Local in Dar es Salaam</li>
              </ul>
            </motion.article>
          </div>
          <p className="eyebrow values-label">{t.valuesLabel}</p>
          <div className="values-grid">
            {t.values.map((value, i) => {
              const icons = [Shield, Award, Handshake, Heart];
              const Icon = icons[i] || CheckCircle2;
              return (
                <FadeUp key={value.title} delay={i * 0.07} className="value-card">
                  <span className="value-icon"><Icon size={20} /></span>
                  <h3>{value.title}</h3>
                  <p>{value.text}</p>
                </FadeUp>
              );
            })}
          </div>
        </Reveal>
      </section>

      <TestimonialsStage />

      <section className="cta-band minimal-cta">
        <Reveal>
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaLead}</p>
          <MagneticLink href={t.whatsappUrl} className="button">{t.ctaButton} <ArrowUpRight size={17} /></MagneticLink>
        </Reveal>
      </section>
    </>
  );
}
