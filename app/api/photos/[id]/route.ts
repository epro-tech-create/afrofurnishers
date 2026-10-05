import { readFile } from 'fs/promises';
import path from 'path';
import { loadProductPhoto } from '@/lib/neon-store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]+$/.test(id)) return new Response('Not found', { status: 404 });

  if (process.env.DATABASE_URL) {
    const photo = await loadProductPhoto(id);
    if (!photo) return new Response('Not found', { status: 404 });
    return new Response(new Uint8Array(photo.bytes), {
      headers: {
        'Content-Type': photo.mime,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  try {
    const bytes = await readFile(path.join(process.cwd(), 'public', 'uploads', 'products', `${id}.jpg`));
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
