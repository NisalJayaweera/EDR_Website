import pool from '../db/index';

const INTERVAL_MS = 5000;   // Seeding interval: 5 seconds
const TEMP_MIN_C = -22;     // Frozen cold-chain range
const TEMP_MAX_C = -14;
const HUM_MIN_PCT = 55;
const HUM_MAX_PCT = 70;

// Colombo area GPS coordinates
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
  console.log('⚡ Telemetry simulator active: generating mock readings for all linked devices every 5s...');

  setInterval(async () => {
    try {
      // Get all devices currently provisioned
      const devicesRes = await pool.query('SELECT id, device_label FROM devices');
      const devices = devicesRes.rows;

      if (devices.length === 0) {
        return; // No devices provisioned yet
      }

      for (const device of devices) {
        const temp = rand(TEMP_MIN_C, TEMP_MAX_C);
        const hum = rand(HUM_MIN_PCT, HUM_MAX_PCT);
        const lat = driftedCoord(BASE_LAT, GPS_DRIFT);
        const lng = driftedCoord(BASE_LNG, GPS_DRIFT);

        // Insert mock sensor reading
        await pool.query(
          `INSERT INTO sensor_readings (device_id, temperature_c, humidity_pct, latitude, longitude, recorded_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [device.id, Number(temp.toFixed(2)), Number(hum.toFixed(2)), Number(lat.toFixed(6)), Number(lng.toFixed(6))]
        );

        // Update last seen status
        await pool.query('UPDATE devices SET last_seen_at = NOW() WHERE id = $1', [device.id]);
      }
    } catch (err: any) {
      console.error('[Telemetry Simulator Error]:', err.message || err);
    }
  }, INTERVAL_MS);
}
