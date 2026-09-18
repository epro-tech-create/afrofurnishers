'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { orderWhatsApp } from '@/lib/whatsapp';
import { Reveal } from './motion';

const moods = [
  {
    name: 'Dar warmth',
    number: '01',
    title: 'Warm colours\nfor family rooms.',
    copy: 'Soft orange, wood and light fabric — a calm look that works in Dar living rooms and flats.',
    image: 'hero',
    colors: ['#c24b35', '#8a6a45', '#d8d4c8'],
    notes: ['Warm clay', 'Wood', 'Light fabric'],
    background: '#ddd8ce',
  },
  {
    name: 'Coast calm',
    number: '02',
    title: 'Light and\nopen, like the coast.',
    copy: 'Natural wood with soft green — easy on the eyes for dining spaces and bright apartments.',
    image: 'dining',
    colors: ['#0a6b66', '#b8a88a', '#e6e8e1'],
    notes: ['Ocean teal', 'Sand wood', 'Chalk'],
    background: '#d4ddd8',
  },
  {
    name: 'Bold accent',
    number: '03',
    title: 'One strong\ncolour you love.',
    copy: 'A coral seat with deep green — add personality without changing the whole room.',
    image: 'sofa',
    colors: ['#c24b35', '#1c332e', '#e6e4de'],
    notes: ['Coral', 'Deep green', 'Cloud'],
    background: '#e2d8d2',
  },
];

export function PaletteStudio() {
  const [selected, setSelected] = useState(0);
  const mood = moods[selected];
  return (
    <section className="palette-studio">
      <Reveal className="section-heading">
        <div>
          <p className="eyebrow">COLOUR IDEAS</p>
          <h2>Pick a look that<br />feels like home.</h2>
        </div>
        <p>Three simple colour moods to help you choose furniture that fits your space.</p>
      </Reveal>
      <motion.div className="palette-layout" animate={{ backgroundColor: mood.background }} transition={{ duration: 0.65 }}>
        <div className="palette-image">
          <AnimatePresence mode="sync">
            <motion.img
              key={mood.image}
              src={`/assets/${mood.image}.jpg`}
              alt={`${mood.name} interior inspiration`}
              width={900}
              height={1100}
              loading="lazy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65 }}
            />
          </AnimatePresence>
          <span className="palette-photo-note">EXAMPLE LOOK · NOT FINAL STOCK</span>
        </div>
        <div className="palette-copy">
          <div className="mood-tabs" role="group" aria-label="Choose a colour mood">
            {moods.map((m, i) => (
              <button key={m.name} onClick={() => setSelected(i)} aria-pressed={selected === i}>
                {m.number} <span>{m.name}</span>
              </button>
            ))}
          </div>
          <div aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div key={selected} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <p className="eyebrow palette-index">LOOK {mood.number}</p>
                <h3>{mood.title}</h3>
                <p>{mood.copy}</p>
                <div className="material-swatches">
                  {mood.colors.map((color, i) => (
                    <div key={color}>
                      <span style={{ background: color }} />
                      <small>{mood.notes[i]}</small>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <a className="text-link" href={orderWhatsApp()} target="_blank" rel="noopener noreferrer">
            Use this look when you shop <ArrowUpRight size={16} />
          </a>
        </div>
      </motion.div>
    </section>
  );
}
