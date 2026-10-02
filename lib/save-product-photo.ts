import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const MAX_CHARS = 1_800_000;

function safeRef(value: string, fallback: string): string {
  if (/^[a-z0-9-]+$/.test(value)) return value;
  if (/^\/uploads\/products\/[a-z0-9-]+\.jpg(\?v=\d+)?$/.test(value)) return value;
  if (/^\/assets\/[a-z0-9-]+\.jpg$/.test(value)) return value;
  return fallback;
}

/** Turn an uploaded data URL into a file under public/uploads. Other values stay as a studio name. */
export async function saveProductPhoto(id: string, image: unknown, fallback = 'hero'): Promise<string> {
  const value = typeof image === 'string' && image.trim() ? image.trim() : fallback;
  if (!value.startsWith('data:')) return safeRef(value, fallback);
  const match = value.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match || value.length > MAX_CHARS) throw new Error('Use a smaller photo. JPG or PNG, under about 1 MB.');
  const safeId = id.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'product';
  const dir = path.join(process.cwd(), 'public', 'uploads', 'products');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${safeId}.jpg`), Buffer.from(match[1], 'base64'));
  return `/uploads/products/${safeId}.jpg?v=${Date.now()}`;
}
