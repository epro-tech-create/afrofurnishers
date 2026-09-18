'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Check } from 'lucide-react';
import { Reveal } from './motion';

const moods = [
  { name: 'Earth & ember', number: '01', title: 'A little sun,\neven indoors.', copy: 'Terracotta, warm wood, and soft neutrals. A palette for slow afternoons and an open-door kind of home.', image: 'hero', colors: ['#a94f2e', '#b68c62', '#e5d8c2'], notes: ['Terracotta', 'Warm oak', 'Oat linen'], background: '#e8dfd0' },
  { name: 'Coastal calm', number: '02', title: 'Room to\ntake a breath.', copy: 'Natural timber and the quiet of sand and sage. Light, grounded, and inspired by life near the coast.', image: 'dining', colors: ['#899482', '#cebfa6', '#f0eadd'], notes: ['Soft sage', 'Natural wood', 'Chalk'], background: '#dfe2d7' },
  { name: 'Playful soul', number: '03', title: 'A space with\nyour personality.', copy: 'A confident touch of coral. Clean lines. A favourite object. Let a little unexpected colour make itself at home.', image: 'sofa', colors: ['#c97966', '#446363', '#e5e4de'], notes: ['Coral', 'Deep teal', 'Cloud'], background: '#e9dcd5' },
];
export function PaletteStudio() {
  const [selected, setSelected] = useState(0);
  const mood = moods[selected];
  return <section className="palette-studio"><Reveal className="section-heading"><div><p className="eyebrow">THE FEELING COMES FIRST</p><h2>Find your kind of warm.</h2></div><p>Three moods. Endless possibilities.<br />Try a palette and see what feels like you.</p></Reveal><motion.div className="palette-layout" animate={{ backgroundColor: mood.background }} transition={{ duration: 0.65 }}><div className="palette-image"><AnimatePresence mode="sync"> <motion.img key={mood.image} src={`/assets/${mood.image}.jpg`} alt={`${mood.name} interior inspiration`} width={900} height={1100} loading="lazy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.65 }} /></AnimatePresence><span className="palette-photo-note">A PALETTE EXPLORATION · INSPIRATION IMAGERY</span></div><div className="palette-copy"><div className="mood-tabs" role="group" aria-label="Choose a room mood">{moods.map((m, i) => <button key={m.name} onClick={() => setSelected(i)} aria-pressed={selected === i}>{m.number} <span>{m.name}</span></button>)}</div><div aria-live="polite"><AnimatePresence mode="wait"><motion.div key={selected} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}><p className="eyebrow palette-index">PALETTE NO. {mood.number}</p><h3>{mood.title}</h3><p>{mood.copy}</p><div className="material-swatches">{mood.colors.map((color, i) => <div key={color}><span style={{ background: color }} /><small>{mood.notes[i]}</small></div>)}</div></motion.div></AnimatePresence></div><Link className="text-link" href={`/custom?palette=${encodeURIComponent(mood.name)}`}>Make this feeling yours <ArrowUpRight size={16} /></Link></div></motion.div></section>;
}
