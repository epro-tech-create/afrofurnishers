import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'AfroFurnitures — Crafted for the Way You Live', template: '%s | AfroFurnitures' },
  description: 'Contemporary furniture, African warmth, and spaces that feel like you. Explore the AfroFurnitures showroom concept in Dar es Salaam.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Shell>{children}</Shell></body></html>;
}
