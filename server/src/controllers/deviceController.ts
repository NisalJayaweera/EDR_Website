import { Response } from 'express';
import pool from '../db/index';
import { AuthRequest } from '../middleware/auth';
import { INTERVAL_STEPS_SET } from '../lib/intervalSteps';
import { sendAlertEmail } from '../services/email';
import { sendAlertSms } from '../services/sms';

/** Get all devices for the authenticated user */
export const getUserDevices = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const result = await pool.query(
      'SELECT * FROM devices WHERE user_id = $1 ORDER BY last_seen_at DESC NULLS LAST',
      [req.user?.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Get devices error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/** Get the latest sensor reading for a specific device */
export const getLatestReading = async (req: AuthRequest, res: Response): Promise<any> => {
  const { id: deviceId } = req.params;

  try {
    const deviceCheck = await pool.query(
      'SELECT id FROM devices WHERE id = $1 AND user_id = $2',
      [deviceId, req.user?.userId]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const result = await pool.query(
      `SELECT temperature_c, humidity_pct, latitude, longitude, recorded_at
       FROM sensor_readings
       WHERE device_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [deviceId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get latest reading error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/** Update upload/recording interval for a device (PATCH) */
export const updateDeviceSettings = async (req: AuthRequest, res: Response): Promise<any> => {
  const { id: deviceId } = req.params;
  const { upload_interval_ms, recording_interval_ms } = req.body;

  // Server-side step validation — don't trust the client
  if (upload_interval_ms !== undefined && !INTERVAL_STEPS_SET.has(Number(upload_interval_ms))) {
    return res.status(400).json({ message: `upload_interval_ms value ${upload_interval_ms} is not an allowed step.` });
  }
  if (recording_interval_ms !== undefined && !INTERVAL_STEPS_SET.has(Number(recording_interval_ms))) {
    return res.status(400).json({ message: `recording_interval_ms value ${recording_interval_ms} is not an allowed step.` });
  }

  try {
    const deviceCheck = await pool.query(
      'SELECT id FROM devices WHERE id = $1 AND user_id = $2',
      [deviceId, req.user?.userId]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const result = await pool.query(
      `UPDATE devices
       SET upload_interval_ms    = COALESCE($1, upload_interval_ms),
           recording_interval_ms = COALESCE($2, recording_interval_ms)
       WHERE id = $3
       RETURNING id, device_label, upload_interval_ms, recording_interval_ms`,
      [upload_interval_ms ?? null, recording_interval_ms ?? null, deviceId]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Update device settings error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/** Ingest a sensor reading — called by the SIM7070G module */
export const postReading = async (req: AuthRequest, res: Response): Promise<any> => {
  const { id: deviceId } = req.params;
  const { temperature_c, humidity_pct, latitude, longitude, recorded_at } = req.body;

  try {
    // Update last_seen_at
    await pool.query('UPDATE devices SET last_seen_at = NOW() WHERE id = $1', [deviceId]);

    const result = await pool.query(
      `INSERT INTO sensor_readings (device_id, temperature_c, humidity_pct, latitude, longitude, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [deviceId, temperature_c, humidity_pct, latitude, longitude, recorded_at || new Date()]
    );

    return res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Post reading error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/devices/:id/track?since=<ISO>&limit=<n>
 * Returns the last N (lat, lng, recorded_at) points for drawing a polyline trail.
 * Only returns rows where lat/lng are not null.
 */
export const getTrackHistory = async (req: AuthRequest, res: Response): Promise<any> => {
  const { id: deviceId } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
  const since = req.query.since as string | undefined;

  try {
    const deviceCheck = await pool.query(
      'SELECT id FROM devices WHERE id = $1 AND user_id = $2',
      [deviceId, req.user?.userId]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const params: any[] = [deviceId, limit];
    let sinceClause = '';
    if (since) {
      params.push(since);
      sinceClause = `AND recorded_at >= $${params.length}`;
    }

    const result = await pool.query(
      `SELECT latitude, longitude, recorded_at, temperature_c
       FROM sensor_readings
       WHERE device_id = $1
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL
         ${sinceClause}
       ORDER BY recorded_at DESC
       LIMIT $2`,
      params
    );

    // Return in chronological order for Polyline rendering
    return res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get track history error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Trigger an email and SMS alert for a threshold breach.
 * Called by the frontend.
 */
export const triggerAlert = async (req: AuthRequest, res: Response): Promise<any> => {
  const { id: deviceId } = req.params;
  const { type, value, threshold, status } = req.body;

  try {
    const deviceCheck = await pool.query(
      'SELECT id FROM devices WHERE id = $1 AND user_id = $2',
      [deviceId, req.user?.userId]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const userResult = await pool.query(
      'SELECT name, email, phone FROM users WHERE id = $1',
      [req.user?.userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, email, phone } = userResult.rows[0];

    const alerts = [];
    if (email) {
      alerts.push(sendAlertEmail(email, name || 'User', type, value, threshold, status));
    }
    if (phone) {
      alerts.push(sendAlertSms(phone, type, value, threshold, status));
    }

    await Promise.allSettled(alerts);

    return res.json({ message: 'Alerts dispatched' });
  } catch (error) {
    console.error('Trigger alert error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
