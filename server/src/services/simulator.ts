import pool from '../db/index';

const INTERVAL_MS = 5000;   // Seeding interval: 5 seconds

// NOTE: Temperature & humidity simulation OFF — real module data only.
// GPS dummy data remains active so the map stays populated.
const BASE_LAT = 6.9271;
const BASE_LNG = 79.8612;
const GPS_DRIFT = 0.002;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function driftedCoord(base: number, drift: number): number {
  return base + rand(-drift, drift);
}

export function startTelemetrySimulator() {
  console.log('⚡ GPS simulator active: generating mock GPS positions every 5s (temp/humidity simulation OFF)...');

  setInterval(async () => {
    try {
      // Get all devices currently provisioned
      const devicesRes = await pool.query('SELECT id, device_label FROM devices');
      const devices = devicesRes.rows;

      if (devices.length === 0) {
        return; // No devices provisioned yet
      }

      for (const device of devices) {
        const lat = driftedCoord(BASE_LAT, GPS_DRIFT);
        const lng = driftedCoord(BASE_LNG, GPS_DRIFT);

        // Insert GPS-only row — temperature_c and humidity_pct are NULL
        // so real module readings are clearly visible on the dashboard charts.
        await pool.query(
          `INSERT INTO sensor_readings (device_id, temperature_c, humidity_pct, latitude, longitude, recorded_at)
           VALUES ($1, NULL, NULL, $2, $3, NOW())`,
          [device.id, Number(lat.toFixed(6)), Number(lng.toFixed(6))]
        );

        // Update last seen status
        await pool.query('UPDATE devices SET last_seen_at = NOW() WHERE id = $1', [device.id]);
      }
    } catch (err: any) {
      console.error('[GPS Simulator Error]:', err.message || err);
    }
  }, INTERVAL_MS);
}
