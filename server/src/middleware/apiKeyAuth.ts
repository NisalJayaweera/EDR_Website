import { Request, Response, NextFunction } from 'express';
import pool from '../db/index';

export interface DeviceRequest extends Request {
  device?: {
    id: string;
    user_id: string;
    device_label: string;
    upload_interval_ms: number;
    recording_interval_ms: number;
  };
}

/**
 * API-key authentication middleware for hardware devices.
 * The SIM7070G firmware sends:  X-Device-Key: <64-hex-char api_key>
 *
 * This is intentionally separate from the user JWT flow — devices can't
 * easily do OAuth/JWT refresh cycles, so a long-lived static key per device
 * is the right tradeoff for an embedded system.
 */
export async function apiKeyAuth(
  req: DeviceRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  const key = req.headers['x-device-key'] as string | undefined;

  if (!key) {
    return res.status(401).json({ message: 'Missing X-Device-Key header' });
  }

  try {
    const result = await pool.query(
      `SELECT id, user_id, device_label, upload_interval_ms, recording_interval_ms
       FROM devices
       WHERE api_key = $1`,
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid device API key' });
    }

    // Attach device info so controllers can use it without another DB hit
    req.device = result.rows[0];
    next();
  } catch (error) {
    console.error('API key auth error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
