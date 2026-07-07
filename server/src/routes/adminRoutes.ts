import { Router } from 'express';
import { addCustomer, getCustomers, provisionDevice } from '../controllers/adminController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Apply middlewares to all routes in this file
router.use(requireAuth);
router.use(requireAdmin);

router.post('/customers', addCustomer);
router.get('/customers', getCustomers);
router.post('/devices', provisionDevice);  // create device + return api_key once

export default router;
