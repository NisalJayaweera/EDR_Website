import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { ingestReadings, ingestCsv, getDeviceSettings } from '../controllers/ingestController';

const router = Router();

// All ingest routes require a valid device API key (X-Device-Key header)
router.use(apiKeyAuth);

// Multer: store CSV uploads in temp dir; ingestCsv controller moves to final location
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max CSV
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are accepted'));
    }
  },
});

router.post('/readings', ingestReadings);
router.post('/csv',      upload.single('file'), ingestCsv);
router.get('/settings',  getDeviceSettings);

export default router;
