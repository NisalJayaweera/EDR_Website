import * as dotenv from 'dotenv';

dotenv.config();

// Whether the proxy is active. Set PROXY_ENABLED=true in .env to turn it on.
// When disabled, no proxy server is started and all traffic must reach the HTTPS site directly.
export const PROXY_ENABLED = process.env.PROXY_ENABLED === 'true';

// The HTTPS site the GSM module's requests will be forwarded to.
// Default: our production Vercel site.
export const PROXY_TARGET = process.env.PROXY_TARGET ?? 'https://edr-backend.onrender.com';

// The separate port the proxy server listens on (so it doesn't conflict with the main app).
export const PROXY_PORT = process.env.PROXY_PORT ?? '9099';
