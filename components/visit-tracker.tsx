'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Fire-and-forget page-view ping for the admin "Visitors" analytics.
// Never blocks rendering; failures are silently ignored.
export function VisitTracker() {
  const path = usePathname();
  useEffect(() => {
    try {
      let vid: string | null = null;
      try {
        vid = localStorage.getItem('afro-vid');
        if (!vid) {
          vid = (crypto as Crypto).randomUUID();
          localStorage.setItem('afro-vid', vid);
        }
      } catch {
        vid = `anon-${Math.random().toString(36).slice(2)}`;
      }
      const body = JSON.stringify({
        path: path || '/',
        visitorId: vid,
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch { /* analytics must never break the page */ }
  }, [path]);
  return null;
}
