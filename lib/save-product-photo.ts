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
  const bytes = Buffer.from(match[1], 'base64');
  const jpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const webp = bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!jpeg && !png && !webp) throw new Error('Use a smaller photo. JPG or PNG, under about 1 MB.');
  const safeId = id.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'product';
  const dir = path.join(process.cwd(), 'public', 'uploads', 'products');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${safeId}.jpg`), bytes);
  return `/uploads/products/${safeId}.jpg?v=${Date.now()}`;
}
