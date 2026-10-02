import type { Metadata } from 'next';
import { AdminApp } from '@/components/admin-panel';
import './admin.css';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Private AfroFurnishers admin.',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
