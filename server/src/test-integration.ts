import { Client } from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

dotenv.config();

const PORT = 4001; // Run test server on a separate port to avoid conflicts
const BASE_URL = `http://localhost:${PORT}/api`;

async function main() {
  console.log('🧪 Starting End-to-End Integration Verification Tests...\n');

  // Initialize DB Client
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let testUserId: string | null = null;
  let testDeviceId: string | null = null;
  let deviceApiKey: string | null = null;
  let serverProcess: ChildProcess | null = null;

  try {
    // 1. Setup Test Data in DB
    console.log('Step 1: Preparing database test records...');
    
    // Create a temporary customer
    const userRes = await client.query(`
      INSERT INTO users (name, username, password_hash, must_change_password, email, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, ['Test Customer', 'test.customer', 'hashed_pwd', false, 'test@example.com', '+94711111111']);
    testUserId = userRes.rows[0].id;
    console.log(`  - Test customer created: ${testUserId}`);

    // Create a tracking device for the customer
    const { randomBytes } = await import('crypto');
    deviceApiKey = randomBytes(32).toString('hex');
    const deviceRes = await client.query(`
      INSERT INTO devices (user_id, device_label, api_key)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [testUserId, 'Test Device Alpha', deviceApiKey]);
    testDeviceId = deviceRes.rows[0].id;
    console.log(`  - Test device provisioned: ${testDeviceId} with API Key`);

    // 2. Start Express Server
    console.log('\nStep 2: Starting backend Express server on port 4001...');
    serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      env: { ...process.env, PORT: PORT.toString() },
      shell: true,
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise<void>((resolve, reject) => {
      let output = '';
      serverProcess?.stdout?.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server listening on port')) {
          resolve();
        }
      });
      serverProcess?.on('error', reject);
      setTimeout(() => reject(new Error('Server start timed out after 10s')), 10000);
    });
    console.log('  - Server is running and listening for requests.');

    // 3. Test 1: Unauthorized CSV Ingestion
    console.log('\nStep 3: Verifying device authentication (X-Device-Key)...');
    const form = new FormData();
    const csvContent = 'recorded_at,temperature_c,humidity_pct,latitude,longitude\n2026-07-11T12:00:00Z,-18.5,62.3,6.9271,79.8612\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    form.append('file', blob, 'test-telemetry.csv');

    const authFailRes = await fetch(`${BASE_URL}/ingest/csv`, {
      method: 'POST',
      headers: { 'x-device-key': 'invalid_api_key' },
      body: form
    });
    console.log(`  - Request with invalid key returned status: ${authFailRes.status} (Expected: 401)`);
    if (authFailRes.status !== 401) throw new Error('Authorization check failed!');

    // 4. Test 2: Authorized CSV Upload Ingestion
    console.log('\nStep 4: Uploading test .csv file using valid device credentials...');
    const uploadRes = await fetch(`${BASE_URL}/ingest/csv`, {
      method: 'POST',
      headers: { 'x-device-key': deviceApiKey },
      body: form
    });
    const uploadData = await uploadRes.json();
    console.log(`  - Response status: ${uploadRes.status} (Expected: 201)`);
    console.log('  - Response payload:', uploadData);

    if (uploadRes.status !== 201) throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);

    // Verify file exists on disk in uploads directory
    const expectedFilePath = path.resolve('uploads', 'csv', testUserId!, 'test-telemetry.csv');
    const fileExistsOnDisk = fs.existsSync(expectedFilePath);
    console.log(`  - File exists on server disk: ${fileExistsOnDisk} (Expected: true)`);
    if (!fileExistsOnDisk) throw new Error('CSV file not written to server disk!');

    // Verify row added to database
    const dbFileRes = await client.query('SELECT * FROM csv_files WHERE device_id = $1', [testDeviceId]);
    console.log(`  - Rows in csv_files table: ${dbFileRes.rows.length} (Expected: 1)`);
    if (dbFileRes.rows.length !== 1) throw new Error('CSV file record not found in database!');

    // 5. Test 3: Retrieve Uploaded CSV Files from Customer Dashboard API
    console.log('\nStep 5: Verifying customer dashboard CSV retrieval...');
    
    // Generate valid JWT token for the customer
    const secret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign({ userId: testUserId, role: 'user' }, secret, { expiresIn: '1h' });

    const clientGetRes = await fetch(`${BASE_URL}/files`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const clientGetFiles = await clientGetRes.json();
    console.log(`  - Customer files GET status: ${clientGetRes.status} (Expected: 200)`);
    console.log('  - Customer files found:', clientGetFiles);

    if (clientGetRes.status !== 200) throw new Error('Customer files fetch failed!');
    if (clientGetFiles.length !== 1 || clientGetFiles[0].file_name !== 'test-telemetry.csv') {
      throw new Error('Retrieved file list does not match expected output!');
    }

    // 6. Test 4: Verify Telemetry Simulator
    console.log('\nStep 6: Verifying background real-time telemetry simulator...');
    console.log('  - Waiting 6 seconds for simulator heartbeat to trigger...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    const readingsRes = await client.query(
      'SELECT * FROM sensor_readings WHERE device_id = $1 ORDER BY recorded_at DESC',
      [testDeviceId]
    );
    console.log(`  - Real-time readings generated: ${readingsRes.rows.length} (Expected: >= 1)`);
    if (readingsRes.rows.length === 0) {
      throw new Error('Telemetry simulator did not populate database readings!');
    }
    console.log('  - Sample telemetry record:', readingsRes.rows[0]);

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The server and site are operating exactly as expected.');

  } catch (error: any) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error.message || error);
  } finally {
    // 7. Cleanup DB and disk
    console.log('\nStep 7: Cleaning up test data and killing test server...');
    
    if (testUserId) {
      // Delete files on disk
      try {
        const userDir = path.resolve('uploads', 'csv', testUserId);
        if (fs.existsSync(userDir)) {
          fs.rmSync(userDir, { recursive: true, force: true });
        }
      } catch (err) {
        console.error('Failed to clean up files on disk:', err);
      }

      // Delete from DB tables
      try {
        await client.query('DELETE FROM sensor_readings WHERE device_id = $1', [testDeviceId]);
        await client.query('DELETE FROM csv_files WHERE device_id = $1', [testDeviceId]);
        await client.query('DELETE FROM devices WHERE user_id = $1', [testUserId]);
        await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
        console.log('  - Database test records successfully purged.');
      } catch (err) {
        console.error('Failed to purge DB records:', err);
      }
    }

    // Terminate server process
    if (serverProcess) {
      serverProcess.kill();
      console.log('  - Test server process terminated.');
    }

    await client.end();
  }
}

main();
