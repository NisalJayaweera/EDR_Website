import { Router } from 'express';
import {
  getUserDevices,
  getLatestReading,
  updateDeviceSettings,
  postReading,
  getTrackHistory,
  triggerAlert,
} from '../controllers/deviceController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getUserDevices);
router.get('/:id/latest', getLatestReading);
router.get('/:id/track', getTrackHistory);         // polyline trail history
router.put('/:id/settings', updateDeviceSettings);
router.patch('/:id/settings', updateDeviceSettings); // alias for PATCH
router.post('/:id/readings', postReading);           // SIM7070G data ingestion
router.post('/:id/alert', triggerAlert);             // trigger SMS/Email alerts

export default router;
