'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { downloadText } from '@/lib/catalog';

const initial = { Furniture: 'Sofa', Dimensions: '', Material: '', Colour: '', Budget: '', 'Delivery area': 'Kinondoni', Notes: '' };
type Brief = typeof initial;
export function CustomForm() {
  const [brief, setBrief] = useState<Brief>(initial);
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [palette, setPalette] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem('afro-brief') || '{}');
      if (stored && typeof stored === 'object') setBrief(current => ({ ...current, ...Object.fromEntries(Object.entries(stored).filter(([key, value]) => key in initial && typeof value === 'string')) }));
    } catch { /* An unavailable draft does not prevent a new brief. */ }
    const chosen = new URLSearchParams(window.location.search).get('palette');
    if (chosen && ['Earth & ember', 'Coastal calm', 'Playful soul'].includes(chosen)) setPalette(chosen);
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { sessionStorage.setItem('afro-brief', JSON.stringify(brief)); } catch { /* Keep the draft in React state. */ } } }, [brief, ready]);
  const update = (key: keyof Brief, value: string) => { setBrief(old => ({ ...old, [key]: value })); setSummary([]); };
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (file && (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) { setError('Please choose a JPG, PNG or WebP image under 5 MB.'); return; }
    if (!brief.Dimensions.trim() || !brief.Material.trim() || !brief.Colour.trim()) { setError('Please add dimensions, a material, and a colour.'); return; }
    setError('');
    setSummary([...Object.entries(brief).map(([key, value]) => `${key}: ${value}`), ...(palette ? [`Inspiration palette: ${palette}`] : []), `Reference: ${file?.name || 'None'}`]);
  }
  useEffect(() => { if (summary.length) { summaryRef.current?.focus(); summaryRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); } }, [summary]);
  return <section className="page"><p className="eyebrow">MADE FOR YOUR KIND OF LIVING</p><h1>Something uniquely yours.</h1><p>A favourite shape, a particular fabric, a perfect fit. Start with an idea.</p>{palette && <div className="palette-selected"><span className="eyebrow">YOUR STARTING POINT</span><strong>{palette}</strong><button onClick={() => setPalette('')} aria-label="Remove selected palette">×</button></div>}<p className="note">Create a design brief to download and keep. Your draft stays in this browser tab. This preview does not send quote requests.</p><form onSubmit={submit}><div className="form-grid"><label>Furniture type<select value={brief.Furniture} onChange={e => update('Furniture', e.target.value)} required>{['Sofa', 'Chair', 'Dining table', 'Bed', 'Desk', 'Outdoor furniture'].map(x => <option key={x}>{x}</option>)}</select></label><label>Dimensions (width × depth × height, cm)<input value={brief.Dimensions} onChange={e => update('Dimensions', e.target.value)} required maxLength={80} placeholder="e.g. 220 × 90 × 80 cm" /></label><label>Material or fabric<input value={brief.Material} onChange={e => update('Material', e.target.value)} required maxLength={100} placeholder="e.g. textured linen, natural wood" /></label><label>Colour<input value={brief.Colour} onChange={e => update('Colour', e.target.value)} required maxLength={80} placeholder="e.g. terracotta" /></label><label>Budget (TZS)<input value={brief.Budget} onChange={e => update('Budget', e.target.value)} type="number" min={1} required placeholder="Your approximate budget" /></label><label>Delivery area<select value={brief['Delivery area']} onChange={e => update('Delivery area', e.target.value)}>{['Kinondoni', 'Ilala', 'Temeke', 'Ubungo', 'Kigamboni', 'Elsewhere in Tanzania'].map(x => <option key={x}>{x}</option>)}</select></label><label className="full">Tell us a little more<textarea value={brief.Notes} onChange={e => update('Notes', e.target.value)} maxLength={2000} placeholder="How will you use it? What details matter most?" /></label><label className="full">Reference image (optional, JPG/PNG/WebP, maximum 5 MB)<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={() => setSummary([])} /><small>The image stays on your device. Select it again if you leave this page.</small></label></div>{error && <p role="alert" className="form-error">{error}</p>}<button className="button">Review my design brief ↗</button></form>{summary.length > 0 && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="brief-summary" ref={summaryRef} tabIndex={-1}><h2>Your idea, on paper.</h2><p>Nothing has been submitted. Your download includes the reference filename only.</p><div className="note">{summary.map(line => <p key={line}>{line}</p>)}</div><button className="button" onClick={() => downloadText('AfroFurnitures-design-brief.txt', 'AfroFurnitures — design brief\nNot submitted. No quote or order has been created.\n\n' + summary.join('\n'))}>Download my brief ↓</button></motion.div>}</section>;
}
