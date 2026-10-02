import type { Order, ProductFull } from '@/lib/shop-types';

function pdfEscape(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63;
    if (ch === '\\' || ch === '(' || ch === ')') out += `\\${ch}`;
    else if (code >= 32 && code <= 126) out += ch;
    else out += '?';
  }
  return out;
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, Math.max(0, max - 3))}...`;
}

function tzs(n: number): string {
  return `TZS ${num(n)}`;
}

function num(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Draw = { text: string; x: number; y: number; size: number; bold: boolean };

function buildPdf(pages: Draw[][]): Uint8Array {
  const streams = pages.map(draws => draws.map(d =>
    `BT /${d.bold ? 'F2' : 'F1'} ${d.size} Tf ${d.x.toFixed(1)} ${d.y.toFixed(1)} Td (${pdfEscape(d.text)}) Tj ET`,
  ).join('\n'));

  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  const kids: number[] = [];
  let next = 5;
  for (const stream of streams) {
    const contentId = next++;
    const pageId = next++;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`;
    kids.push(pageId);
  }
  objects[2] = `<< /Type /Pages /Kids [${kids.map(id => `${id} 0 R`).join(' ')}] /Count ${kids.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  const count = next - 1;
  for (let id = 1; id <= count; id++) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${count + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let id = 1; id <= count; id++) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function downloadShopReport(orders: Order[], products: ProductFull[], kind: 'sales' | 'stock' | 'full' = 'full') {
  const pages: Draw[][] = [[]];
  let y = 800;
  const stamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function page() { return pages[pages.length - 1]; }
  function header() {
    page().push({ text: 'AfroFurnishers', x: 40, y: 812, size: 16, bold: true });
    const titles = { sales: 'Sales report', stock: 'Stock report', full: 'Shop report' } as const;
    page().push({ text: titles[kind], x: 40, y: 794, size: 10, bold: false });
    page().push({ text: stamp, x: 430, y: 812, size: 9, bold: false });
    y = 768;
  }
  function nextPage() {
    pages.push([]);
    header();
  }
  function need(h: number) {
    if (y - h < 46) nextPage();
  }
  function text(value: string, x: number, size: number, bold = false, gap = 5) {
    need(size + gap);
    page().push({ text: value, x, y, size, bold });
    y -= size + gap;
  }
  function cols(cells: { text: string; x: number }[], size: number, bold = false) {
    need(size + 6);
    for (const cell of cells) page().push({ text: cell.text, x: cell.x, y, size, bold });
    y -= size + 6;
  }

  header();
  const live = orders.filter(o => o.status !== 'cancelled');
  const revenue = live.reduce((s, o) => s + o.total, 0);
  const paid = live.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);
  const units = products.filter(p => p.active).reduce((s, p) => s + p.stock, 0);
  const stockValue = products.filter(p => p.active).reduce((s, p) => s + p.stock * p.price, 0);

  if (kind !== 'stock') {
  text(`Sales ${orders.length}    Revenue ${tzs(revenue)}    Paid ${tzs(paid)}`, 40, 10, true, 8);
  }
  if (kind !== 'sales') {
  text(`Stock on hand ${units} units    Stock value ${tzs(stockValue)}`, 40, 10, false, 14);
  }

  if (kind !== 'stock') {
    cols([
      { text: 'Sale', x: 40 },
      { text: 'Customer', x: 105 },
      { text: 'Date', x: 230 },
      { text: 'Pieces', x: 300 },
      { text: 'Total TZS', x: 430 },
      { text: 'Status', x: 510 },
    ], 8, true);

    const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const o of sorted) {
      const pieces = o.items.map(i => `${i.name} x${i.qty}`).join(', ');
      cols([
        { text: o.id, x: 40 },
        { text: clip(o.customer.name, 22), x: 105 },
        { text: when(o.createdAt), x: 230 },
        { text: clip(pieces, 24), x: 300 },
        { text: num(o.total), x: 430 },
        { text: o.status, x: 510 },
      ], 8);
    }
    if (!sorted.length) text('No sales recorded yet.', 40, 10);
  }

  if (kind !== 'sales') {
  y -= 8;
  text('Stock', 40, 13, true, 10);
  cols([
    { text: 'Piece', x: 40 },
    { text: 'Category', x: 230 },
    { text: 'On hand', x: 360 },
    { text: 'Price TZS', x: 400 },
    { text: 'Value TZS', x: 490 },
  ], 8, true);
  const stock = [...products].filter(p => p.active).sort((a, b) => a.name.localeCompare(b.name));
  for (const p of stock) {
    cols([
      { text: clip(p.name, 32), x: 40 },
      { text: clip(p.category, 18), x: 230 },
      { text: String(p.stock), x: 360 },
      { text: num(p.price), x: 400 },
      { text: num(p.stock * p.price), x: 490 },
    ], 8);
  }
  if (!stock.length) text('No pieces in the catalogue.', 40, 10);
  }

  const bytes = buildPdf(pages);
  savePdf(bytes, kind);
}

function savePdf(bytes: Uint8Array, kind: string) {
  const blob = new Blob([bytes.slice()], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `afrofurnishers-${kind}-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
