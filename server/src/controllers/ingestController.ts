import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import pool from '../db/index';
import { DeviceRequest } from '../middleware/apiKeyAuth';

/** -------------------------------------------------------------------
 * POST /api/ingest/readings
 * Body: { readings: [{temperature_c, humidity_pct, latitude?, longitude?, recorded_at?}] }
 * Auth: X-Device-Key header
 * -------------------------------------------------------------------*/
export const ingestReadings = async (req: DeviceRequest, res: Response): Promise<any> => {
  const device = req.device!;
  const { readings } = req.body;

  if (!Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ message: '"readings" must be a non-empty array' });
  }

  // Clamp to 500 rows per batch to prevent runaway inserts
  const batch = readings.slice(0, 500);

  try {
    // Build a single multi-row INSERT for efficiency
    const values: any[] = [];
    const placeholders = batch.map((r, i) => {
      const base = i * 6;
      values.push(
        device.id,
        r.temperature_c ?? null,
        r.humidity_pct  ?? null,
        r.latitude      ?? null,
        r.longitude     ?? null,
        r.recorded_at   ? new Date(r.recorded_at) : new Date()
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    });

    await pool.query(
      `INSERT INTO sensor_readings
         (device_id, temperature_c, humidity_pct, latitude, longitude, recorded_at)
       VALUES ${placeholders.join(', ')}`,
      values
    );

    // Update device heartbeat
    await pool.query(
      'UPDATE devices SET last_seen_at = NOW() WHERE id = $1',
      [device.id]
    );

    return res.status(201).json({
      message: `${batch.length} reading(s) inserted`,
      skipped: readings.length - batch.length,
    });
  } catch (error) {
    console.error('Ingest readings error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/** -------------------------------------------------------------------
 * POST /api/ingest/csv
 * Content-Type: multipart/form-data, field name: "file"
 * Auth: X-Device-Key header
 * -------------------------------------------------------------------*/
export const ingestCsv = async (req: DeviceRequest, res: Response): Promise<any> => {
  const device = req.device!;

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Use multipart field name "file".' });
  }

  try {
    // Build the target path: uploads/csv/{userId}/{originalname}
    const userDir = path.resolve('uploads', 'csv', device.user_id);
    fs.mkdirSync(userDir, { recursive: true });

    const fileName = req.file.originalname || `${Date.now()}.csv`;
    const destPath = path.join(userDir, fileName);

    // Move from multer temp location to permanent location
    fs.renameSync(req.file.path, destPath);

    const sizeBytes = fs.statSync(destPath).size;

    await pool.query(
      `INSERT INTO csv_files (device_id, file_name, storage_path, size_bytes)
       VALUES ($1, $2, $3, $4)`,
      [device.id, fileName, destPath, sizeBytes]
    );

    await pool.query(
      'UPDATE devices SET last_seen_at = NOW() WHERE id = $1',
      [device.id]
    );

    return res.status(201).json({ message: 'CSV file received', file_name: fileName, size_bytes: sizeBytes });
  } catch (error) {
    console.error('Ingest CSV error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/** -------------------------------------------------------------------
 * GET /api/ingest/settings
 * Returns the current upload_interval_ms and recording_interval_ms for
 * this device so firmware can adopt new slider values on next check-in.
 * Auth: X-Device-Key header
 * -------------------------------------------------------------------*/
export const getDeviceSettings = async (req: DeviceRequest, res: Response): Promise<any> => {
  const device = req.device!;
  return res.json({
    upload_interval_ms:    device.upload_interval_ms,
    recording_interval_ms: device.recording_interval_ms,
  });
};
