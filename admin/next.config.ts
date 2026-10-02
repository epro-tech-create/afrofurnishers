import type { NextConfig } from 'next';

const SHOP = process.env.SHOP_API_URL || 'http://localhost:4173';

const config: NextConfig = {
  async rewrites() {
    // Same-origin proxy to the shop backend — no CORS needed in the browser.
    return [{ source: '/shop-api/:path*', destination: `${SHOP}/api/:path*` }];
  },
};

export default config;
