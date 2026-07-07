import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import deviceRoutes from './routes/deviceRoutes';
import csvRoutes from './routes/csvRoutes';
import ingestRoutes from './routes/ingestRoutes';

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/files', csvRoutes);
app.use('/api/ingest', ingestRoutes);   // device firmware endpoints (X-Device-Key auth)

app.get('/', (req, res) => {
  res.send('Neutronics Cold Chain Server Running!');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
