import type { Metadata } from 'next';
import { SuperadminApp } from '@/components/superadmin-panel';
import './superadmin.css';

export const metadata: Metadata = {
  title: 'Super admin',
  description: 'Private AfroFurnishers monitoring.',
  robots: { index: false, follow: false },
};

export default function SuperadminPage() {
  return <SuperadminApp />;
}
