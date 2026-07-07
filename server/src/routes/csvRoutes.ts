import { Router } from 'express';
import { listFiles, downloadFile, deleteFile } from '../controllers/csvController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', listFiles);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

export default router;
