import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'AfroFurnitures — Quality Furniture for Sale in Dar es Salaam', template: '%s | AfroFurnitures' },
  description: 'AfroFurnitures sells quality sofas, dining sets, beds and more in Dar es Salaam, Tanzania. Browse the collection and contact us to buy.',
  icons: { icon: '/favicon.svg' },
};

const themeBoot = `(function(){try{var t=localStorage.getItem('afro-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t);document.documentElement.lang='en'}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
