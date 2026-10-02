import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AfroFurnishers Admin',
  description: 'AfroFurnishers command centre — sales, orders, products, customers and visitors.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
