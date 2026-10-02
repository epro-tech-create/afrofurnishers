export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  material: string;
  dimensions: string;
  color: string;
}

export const products: Product[] = [];

export const rooms = ['All', 'Living Room', 'Dining Room', 'Bedroom', 'Office', 'Outdoor'];
export const money = (value: number) => `TZS ${new Intl.NumberFormat('en-TZ').format(value)}`;

/** Studio shots are short names. Uploaded photos are a path or a data URL. */
export function productImage(image: string | undefined | null): string {
  const value = image || 'hero';
  if (value.startsWith('data:') || value.startsWith('/') || value.startsWith('http')) return value;
  return `/assets/${value}.jpg`;
}
export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
