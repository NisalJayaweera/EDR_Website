import dotenv from 'dotenv';
dotenv.config(); // must be first — loads PORT and PROXY_* before anything reads them

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import deviceRoutes from './routes/deviceRoutes';
import csvRoutes from './routes/csvRoutes';
import ingestRoutes from './routes/ingestRoutes';

import { PROXY_ENABLED, PROXY_TARGET, PROXY_PORT } from './proxy.config';
import { startTelemetrySimulator } from './services/simulator';

const app = express();
const port = process.env.PORT || 8080;

// Trust reverse proxy (e.g. Fly.io) to allow rate limiter to read X-Forwarded-For headers
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Diagnostic request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP RESPONSE] ${req.method} ${req.url} | Status: ${res.statusCode} | Duration: ${duration}ms`);
  });
  next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/files', csvRoutes);
app.use('/api/ingest', ingestRoutes);   // device firmware endpoints (X-Device-Key auth)

// Serve React frontend static files
// The public/ folder is only present in the Fly.io Docker build.
// On Render (API-only deployment) this folder does not exist — skip gracefully.
const clientBuildPath = path.join(__dirname, '..', 'public');
const indexPath = path.join(clientBuildPath, 'index.html');
const hasFrontend = fs.existsSync(indexPath);

if (hasFrontend) {
  app.use(express.static(clientBuildPath));

  // Fallback: serve index.html for all non-API routes (client-side routing)
  app.get('/*splat', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // API-only mode (Render) — return 200 for health checks on root
  app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', mode: 'api-only' });
  });
}

// ─── Main server ──────────────────────────────────────────────────────────────
app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Main server listening on port ${port}`);
  // startTelemetrySimulator(); // Dummy telemetry disabled

  // ─── Optional HTTP → HTTPS proxy (for GSM modules that can't do HTTPS) ──────
  // Toggle via PROXY_ENABLED in .env.
  // When ON:  GSM module sends HTTP to http://<host>:PROXY_PORT/api/...
  //           Proxy forwards to PROXY_TARGET (HTTPS site) transparently.
  // When OFF: No proxy server is started. New modules (SIMA7670C) call PROXY_TARGET directly.
  const proxyApp = express();
  proxyApp.get('/health', (req, res) => res.status(200).send('OK'));

  if (PROXY_ENABLED) {
    proxyApp.use(
      '/',
      createProxyMiddleware({
        target: PROXY_TARGET,
        changeOrigin: true,
        secure: true,
        on: {
          proxyReq: (_proxyReq, req) => {
            console.log(`[PROXY] ${req.method} ${req.url} → ${PROXY_TARGET}${req.url}`);
          },
        },
      })
    );
  } else {
    proxyApp.use('/', (req, res) => {
      res.status(200).json({ error: 'Proxy is disabled. Point module directly to HTTPS backend.', status: 'OK' });
    });
  }

  proxyApp.listen(Number(PROXY_PORT), '0.0.0.0', () => {
    if (PROXY_ENABLED) {
      console.log(`[PROXY] HTTP→HTTPS proxy ON  | port ${PROXY_PORT} → ${PROXY_TARGET}`);
    } else {
      console.log(`[PROXY] Proxy OFF | Port ${PROXY_PORT} will reject requests`);
    }
  });
});
