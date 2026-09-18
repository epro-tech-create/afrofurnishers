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

export const products: Product[] = [
  { id: 'masaki', name: 'Masaki Modular Sofa', category: 'Living Room', price: 2450000, image: 'hero', material: 'Textured upholstery', dimensions: '240 × 95 × 78 cm', color: 'Terracotta' },
  { id: 'bahari', name: 'Bahari Dining Set', category: 'Dining Room', price: 1850000, image: 'dining', material: 'Natural wood', dimensions: '180 × 90 × 75 cm', color: 'Natural' },
  { id: 'kariakoo', name: 'Kariakoo Accent Seat', category: 'Living Room', price: 680000, image: 'sofa', material: 'Woven upholstery', dimensions: '120 × 70 × 76 cm', color: 'Coral' },
];

export const rooms = ['All', 'Living Room', 'Dining Room', 'Bedroom', 'Office', 'Outdoor'];
export const money = (value: number) => `TZS ${new Intl.NumberFormat('en-TZ').format(value)}`;
export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
