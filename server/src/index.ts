import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Trust reverse proxy (e.g. Fly.io) to allow rate limiter to read X-Forwarded-For headers
app.set('trust proxy', 1);

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import deviceRoutes from './routes/deviceRoutes';
import csvRoutes from './routes/csvRoutes';
import ingestRoutes from './routes/ingestRoutes';

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/files', csvRoutes);
app.use('/api/ingest', ingestRoutes);   // device firmware endpoints (X-Device-Key auth)

// Serve React frontend static files from the public directory
const clientBuildPath = path.join(__dirname, '..', 'public');
app.use(express.static(clientBuildPath));

// Fallback: serve index.html for all non-API routes (supports client-side routing)
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

import { startTelemetrySimulator } from './services/simulator';

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
  startTelemetrySimulator();
});
