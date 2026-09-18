'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { downloadText } from '@/lib/catalog';
import { orderWhatsApp } from '@/lib/whatsapp';

const initial = { Furniture: 'Sofa', Dimensions: '', Material: '', Colour: '', Budget: '', 'Delivery area': 'Kinondoni', Notes: '' };
type Brief = typeof initial;

export function CustomForm() {
  const [brief, setBrief] = useState<Brief>(initial);
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<string[]>([]);
  const [error, setError] = useState('');
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem('afro-brief') || '{}');
      if (stored && typeof stored === 'object') {
        setBrief(current => ({
          ...current,
          ...Object.fromEntries(Object.entries(stored).filter(([key, value]) => key in initial && typeof value === 'string')),
        }));
      }
    } catch { /* keep defaults */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try { sessionStorage.setItem('afro-brief', JSON.stringify(brief)); } catch { /* ok */ }
    }
  }, [brief, ready]);

  const update = (key: keyof Brief, value: string) => {
    setBrief(old => ({ ...old, [key]: value }));
    setSummary([]);
  };

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!brief.Dimensions.trim() || !brief.Material.trim() || !brief.Colour.trim()) {
      setError('Please add dimensions, material and colour.');
      return;
    }
    setError('');
    setSummary(Object.entries(brief).map(([key, value]) => `${key}: ${value}`));
  }

  useEffect(() => {
    if (summary.length) {
      summaryRef.current?.focus();
      summaryRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      });
    }
  }, [summary]);

  return (
    <section className="page">
      <p className="eyebrow">BUYING NOTES</p>
      <h1>Tell us what you want to buy.</h1>
      <p>Use this form to list the furniture you need before you contact us. Nothing is purchased online.</p>
      <p className="note">Download your notes and share them when you speak with AfroFurnitures.</p>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>Furniture type
            <select value={brief.Furniture} onChange={e => update('Furniture', e.target.value)} required>
              {['Sofa', 'Chair', 'Dining table', 'Bed', 'Desk', 'Outdoor furniture'].map(x => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>Dimensions (cm)
            <input value={brief.Dimensions} onChange={e => update('Dimensions', e.target.value)} required maxLength={80} placeholder="e.g. 220 × 90 × 80" />
          </label>
          <label>Material
            <input value={brief.Material} onChange={e => update('Material', e.target.value)} required maxLength={100} />
          </label>
          <label>Colour
            <input value={brief.Colour} onChange={e => update('Colour', e.target.value)} required maxLength={80} />
          </label>
          <label>Budget (TZS)
            <input value={brief.Budget} onChange={e => update('Budget', e.target.value)} type="number" min={1} required />
          </label>
          <label>Area
            <select value={brief['Delivery area']} onChange={e => update('Delivery area', e.target.value)}>
              {['Kinondoni', 'Ilala', 'Temeke', 'Ubungo', 'Kigamboni', 'Elsewhere in Tanzania'].map(x => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="full">Notes
            <textarea value={brief.Notes} onChange={e => update('Notes', e.target.value)} maxLength={2000} />
          </label>
        </div>
        {error && <p role="alert" className="form-error">{error}</p>}
        <button className="button">Review notes →</button>
      </form>
      {summary.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="brief-summary" ref={summaryRef} tabIndex={-1}>
          <h2>Your notes</h2>
          <div className="note">{summary.map(line => <p key={line}>{line}</p>)}</div>
          <button className="button" onClick={() => downloadText('AfroFurnitures-project-notes.txt', 'AfroFurnitures project notes\nNot an order.\n\n' + summary.join('\n'))}>
            Download notes ↓
          </button>
          <p><a className="text-link" href={orderWhatsApp()} target="_blank" rel="noopener noreferrer">Order on WhatsApp →</a></p>
        </motion.div>
      )}
    </section>
  );
}
