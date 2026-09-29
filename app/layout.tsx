import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'AfroFurnishers | Quality Furniture for Sale in Dar es Salaam', template: '%s | AfroFurnishers' },
  description: 'AfroFurnishers sells quality sofas, dining sets, beds and more in Dar es Salaam, Tanzania. Browse the collection and contact us to buy.',
  icons: { icon: '/favicon.svg' },
};

const themeBoot = `(function(){try{localStorage.setItem('afro-theme','light');document.documentElement.setAttribute('data-theme','light');document.documentElement.lang='en'}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.lang='en'}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://db.onlinewebfonts.com" crossOrigin="anonymous" />
        {/* Kaleko 105 Bold for titles loads via @font-face in globals.css (font-display: swap, non-blocking).
            No render-blocking stylesheet link here on purpose so first paint never waits on the font CDN. */}
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
