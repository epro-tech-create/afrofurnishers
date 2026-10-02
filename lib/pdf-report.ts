import type { Order, OrderStatus, ProductFull } from '@/lib/shop-types';

type RGB = [number, number, number];

const ORANGE: RGB = [228 / 255, 87 / 255, 46 / 255];
const BLACK: RGB = [0.067, 0.067, 0.067];
const WHITE: RGB = [1, 1, 1];
const SOFT: RGB = [0.27, 0.27, 0.27];
const PAPER: RGB = [0.965, 0.965, 0.965];
const LINE: RGB = [0.9, 0.9, 0.9];

const PAGE_W = 842;
const PAGE_H = 595;
const LEFT = 36;
const RIGHT = PAGE_W - 36;

const STATUS: Record<OrderStatus, string> = {
  pending: 'Order placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  delivering: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

type Cmd =
  | { t: 'fill'; x: number; y: number; w: number; h: number; c: RGB }
  | { t: 'text'; x: number; y: number; size: number; bold: boolean; c: RGB; text: string };

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

function num(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function tzs(n: number): string {
  return `TZS ${num(n)}`;
}

function width(text: string, size: number, bold: boolean): number {
  return text.length * size * (bold ? 0.52 : 0.5);
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildPdf(pages: Cmd[][]): Uint8Array {
  const streams = pages.map(cmds => cmds.map(cmd => {
    const [r, g, b] = cmd.c;
    const color = `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`;
    if (cmd.t === 'fill') {
      return `${color} ${cmd.x.toFixed(1)} ${cmd.y.toFixed(1)} ${cmd.w.toFixed(1)} ${cmd.h.toFixed(1)} re f`;
    }
    return `${color} BT /${cmd.bold ? 'F2' : 'F1'} ${cmd.size} Tf ${cmd.x.toFixed(1)} ${cmd.y.toFixed(1)} Td (${pdfEscape(cmd.text)}) Tj ET`;
  }).join('\n'));

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
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`;
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
  const titles = { sales: 'Sales report', stock: 'Inventory report', full: 'Shop report' } as const;
  const stamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const pages: Cmd[][] = [];
  let page: Cmd[] = [];
  let top = 520;

  function text(value: string, x: number, y: number, size: number, bold: boolean, color: RGB) {
    page.push({ t: 'text', text: value, x, y, size, bold, c: color });
  }
  function right(value: string, edge: number, y: number, size: number, bold: boolean, color: RGB) {
    text(value, edge - width(value, size, bold), y, size, bold, color);
  }
  function fill(x: number, y: number, w: number, h: number, c: RGB) {
    page.push({ t: 'fill', x, y, w, h, c });
  }
  function header() {
    fill(0, PAGE_H - 64, PAGE_W, 64, ORANGE);
    text('AFROFURNISHERS', LEFT, PAGE_H - 30, 16, true, WHITE);
    text('Dar es Salaam  ·  Made for the home', LEFT, PAGE_H - 48, 9, false, WHITE);
    right(titles[kind].toUpperCase(), RIGHT, PAGE_H - 28, 12, true, WHITE);
    right(stamp, RIGHT, PAGE_H - 46, 9, false, WHITE);
  }
  function footer(index: number, total: number) {
    fill(LEFT, 28, RIGHT - LEFT, 1, LINE);
    page.push({ t: 'text', text: 'AfroFurnishers  ·  +255 692 009 222  ·  Workshop copy', x: LEFT, y: 14, size: 8, bold: false, c: SOFT });
    const label = `Page ${index} of ${total}`;
    page.push({ t: 'text', text: label, x: RIGHT - width(label, 8, false), y: 14, size: 8, bold: false, c: SOFT });
  }
  function fresh(start: number) {
    page = [];
    pages.push(page);
    header();
    top = start;
  }
  function need(height: number, afterBreak: () => void) {
    if (top - height < 46) {
      fresh(500);
      afterBreak();
    }
  }

  const live = orders.filter(o => o.status !== 'cancelled');
  const revenue = live.reduce((s, o) => s + o.total, 0);
  const paid = live.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);
  const due = revenue - paid;
  const units = products.filter(p => p.active).reduce((s, p) => s + p.stock, 0);
  const stockValue = products.filter(p => p.active).reduce((s, p) => s + p.stock * p.price, 0);
  const low = products.filter(p => p.active && p.stock <= 5).length;

  fresh(PAGE_H - 84);

  const cards: { label: string; value: string }[] = [];
  if (kind !== 'stock') {
    cards.push(
      { label: 'Sales', value: String(orders.length) },
      { label: 'Revenue', value: tzs(revenue) },
      { label: 'Collected', value: tzs(paid) },
      { label: 'Still to collect', value: tzs(due) },
    );
  } else {
    cards.push(
      { label: 'Pieces on hand', value: String(units) },
      { label: 'Inventory value', value: tzs(stockValue) },
      { label: 'Low inventory', value: String(low) },
      { label: 'Catalogue', value: String(products.filter(p => p.active).length) },
    );
  }
  const gap = 10;
  const boxW = (RIGHT - LEFT - gap * (cards.length - 1)) / cards.length;
  cards.forEach((card, i) => {
    const x = LEFT + i * (boxW + gap);
    const bottom = top - 58;
    fill(x, bottom, boxW, 58, PAPER);
    fill(x, bottom, 4, 58, i % 2 === 0 ? ORANGE : BLACK);
    text(card.label.toUpperCase(), x + 14, bottom + 36, 8, true, SOFT);
    text(card.value, x + 14, bottom + 16, 12, true, BLACK);
  });
  top -= 78;

  function sectionTitle(label: string) {
    need(28, () => {});
    text(label, LEFT, top - 16, 13, true, BLACK);
    top -= 28;
  }

  function salesTable() {
    const columns = () => {
      fill(LEFT, top - 22, RIGHT - LEFT, 22, BLACK);
      const y = top - 15;
      text('DATE', LEFT + 8, y, 8, true, WHITE);
      text('SALE', 118, y, 8, true, WHITE);
      text('CUSTOMER', 190, y, 8, true, WHITE);
      text('PIECES', 350, y, 8, true, WHITE);
      right('AMOUNT', 640, y, 8, true, WHITE);
      text('PAYMENT', 656, y, 8, true, WHITE);
      text('STATUS', 720, y, 8, true, WHITE);
      top -= 22;
    };
    sectionTitle('Sales');
    columns();
    const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    sorted.forEach((order, index) => {
      need(24, columns);
      const bottom = top - 22;
      if (index % 2 === 0) fill(LEFT, bottom, RIGHT - LEFT, 22, PAPER);
      const y = bottom + 7;
      const pieces = order.items.map(item => `${item.name} x${item.qty}`).join(', ');
      const pay = order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid';
      text(when(order.createdAt), LEFT + 8, y, 8, false, BLACK);
      text(order.id, 118, y, 8, true, BLACK);
      text(clip(order.customer.name, 24), 190, y, 8, false, BLACK);
      text(clip(pieces || '-', 32), 350, y, 8, false, BLACK);
      right(num(order.total), 640, y, 8, true, BLACK);
      text(pay, 656, y, 8, false, BLACK);
      text(STATUS[order.status], 720, y, 8, false, order.status === 'cancelled' ? SOFT : BLACK);
      top = bottom;
    });
    if (!sorted.length) {
      text('No sales recorded yet.', LEFT, top - 16, 10, false, SOFT);
      top -= 24;
    } else {
      need(26, () => {});
      fill(LEFT, top - 24, RIGHT - LEFT, 24, BLACK);
      text('TOTAL  ·  cancelled sales left out', LEFT + 8, top - 16, 9, true, WHITE);
      right(tzs(revenue), 640, top - 16, 9, true, WHITE);
      top -= 24;
    }
    top -= 16;
  }

  function stockTable() {
    const columns = () => {
      fill(LEFT, top - 22, RIGHT - LEFT, 22, BLACK);
      const y = top - 15;
      text('PIECE', LEFT + 8, y, 8, true, WHITE);
      text('CATEGORY', 300, y, 8, true, WHITE);
      text('ON HAND', 450, y, 8, true, WHITE);
      right('UNIT PRICE', 620, y, 8, true, WHITE);
      right('STOCK VALUE', 750, y, 8, true, WHITE);
      text('NOTE', 766, y, 8, true, WHITE);
      top -= 22;
    };
    sectionTitle('Inventory on hand');
    columns();
    const stock = products.filter(p => p.active).sort((a, b) => a.name.localeCompare(b.name));
    stock.forEach((product, index) => {
      need(24, columns);
      const bottom = top - 22;
      if (index % 2 === 0) fill(LEFT, bottom, RIGHT - LEFT, 22, PAPER);
      const y = bottom + 7;
      const short = product.stock <= 5;
      text(clip(product.name, 38), LEFT + 8, y, 8, false, BLACK);
      text(clip(product.category, 18), 300, y, 8, false, BLACK);
      text(String(product.stock), 450, y, 8, true, BLACK);
      right(num(product.price), 620, y, 8, false, BLACK);
      right(num(product.stock * product.price), 750, y, 8, true, BLACK);
      if (short) text('LOW', 766, y, 8, true, ORANGE);
      top = bottom;
    });
    if (!stock.length) {
      text('No pieces in the catalogue.', LEFT, top - 16, 10, false, SOFT);
      top -= 24;
    } else {
      need(26, () => {});
      fill(LEFT, top - 24, RIGHT - LEFT, 24, BLACK);
      text(`${units} units on hand${low ? `  ·  ${low} at 5 or below` : ''}`, LEFT + 8, top - 16, 9, true, WHITE);
      right(tzs(stockValue), 750, top - 16, 9, true, WHITE);
      top -= 24;
    }
  }

  if (kind !== 'stock') salesTable();
  if (kind === 'full') {
    if (top < 160) fresh(500);
  }
  if (kind !== 'sales') stockTable();

  pages.forEach((cmds, index) => {
    page = cmds;
    footer(index + 1, pages.length);
  });

  savePdf(buildPdf(pages), kind);
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
