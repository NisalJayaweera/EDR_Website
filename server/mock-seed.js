#!/usr/bin/env node
/**
 * Mock sensor data seeder
 * Inserts a live-looking sensor reading every 3 seconds into the first device found.
 * Use this during demos when the SIM7070G hardware isn't connected.
 *
 * Usage:
 *   node mock-seed.js
 *   node mock-seed.js --device-id <uuid>   (to target a specific device)
 *
 * Requires DATABASE_URL in .env (same as the server).
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const INTERVAL_MS  = 3000;   // insert a new reading every 3 seconds
const TEMP_MIN_C   = -22;    // simulate frozen cold-chain range
const TEMP_MAX_C   = -14;
const HUM_MIN_PCT  = 55;
const HUM_MAX_PCT  = 70;

// Colombo area GPS drift simulation
const BASE_LAT  = 6.9271;
const BASE_LNG  = 79.8612;
const GPS_DRIFT = 0.002;     // ±0.002° (~220m)

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function driftedCoord(base, drift) {
  return base + rand(-drift, drift);
}

async function run() {
  const args = process.argv.slice(2);
  let deviceId = null;

  const idFlag = args.indexOf('--device-id');
  if (idFlag !== -1 && args[idFlag + 1]) {
    deviceId = args[idFlag + 1];
  }

  if (!deviceId) {
    const res = await pool.query('SELECT id FROM devices ORDER BY id LIMIT 1');
    if (res.rows.length === 0) {
      console.error('❌  No devices found in DB. Provision a device first via POST /api/admin/devices.');
      process.exit(1);
    }
    deviceId = res.rows[0].id;
  }

  console.log(`✅  Seeding mock readings for device ${deviceId}`);
  console.log(`    Interval: ${INTERVAL_MS / 1000}s | Temp range: ${TEMP_MIN_C}–${TEMP_MAX_C}°C`);
  console.log('    Press Ctrl+C to stop.\n');

  setInterval(async () => {
    const temp = rand(TEMP_MIN_C, TEMP_MAX_C);
    const hum  = rand(HUM_MIN_PCT, HUM_MAX_PCT);
    const lat  = driftedCoord(BASE_LAT, GPS_DRIFT);
    const lng  = driftedCoord(BASE_LNG, GPS_DRIFT);

    try {
      await pool.query(
        `INSERT INTO sensor_readings (device_id, temperature_c, humidity_pct, latitude, longitude, recorded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [deviceId, temp.toFixed(2), hum.toFixed(2), lat.toFixed(6), lng.toFixed(6)]
      );
      await pool.query('UPDATE devices SET last_seen_at = NOW() WHERE id = $1', [deviceId]);
      console.log(`  → ${new Date().toLocaleTimeString()}  Temp: ${temp.toFixed(1)}°C  Hum: ${hum.toFixed(1)}%  GPS: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } catch (err) {
      console.error('  Insert error:', err.message);
    }
  }, INTERVAL_MS);
}

run().catch(err => { console.error(err); process.exit(1); });
