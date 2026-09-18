'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Reveal } from '@/components/motion';
import { usePrefs } from '@/components/prefs';

export const clientLogos = [
  { name: 'Exim Bank', src: '/assets/clients/exim-bank.png' },
  { name: 'Stanbic Bank', src: '/assets/clients/stanbic-bank.png' },
  { name: 'Lulu Cement', src: '/assets/clients/lulu-cement.png' },
  { name: 'Twiga Cement', src: '/assets/clients/twiga-cement.jpg' },
  { name: 'ERB', src: '/assets/clients/erb.png' },
  { name: 'LITA', src: '/assets/clients/lita.png' },
  { name: 'NIT', src: '/assets/clients/nit.png' },
  { name: 'Open University', src: '/assets/clients/open-university.png' },
] as const;

export function ClientsMarquee() {
  const { t } = usePrefs();
  const reduced = useReducedMotion();
  const loop = [...clientLogos, ...clientLogos];

  return (
    <section className="section soft clients-marquee-section" id="clients" aria-label="Our clients">
      <Reveal>
        <div className="section-heading centre">
          <div>
            <p className="eyebrow">{t.clientsEyebrow}</p>
            <h2>{t.clientsTitle}</h2>
          </div>
          <p>{t.clientsLead}</p>
        </div>
      </Reveal>

      <div className="clients-marquee-wrap">
        <motion.div
          className="clients-marquee-track"
          animate={reduced ? undefined : { x: ['0%', '-50%'] }}
          transition={reduced ? undefined : { duration: 32, ease: 'linear', repeat: Infinity }}
        >
          {loop.map((client, i) => (
            <div className="client-logo" key={`${client.name}-${i}`}>
              <img src={client.src} alt={client.name} width={180} height={64} loading="lazy" />
              <span>{client.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
