require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: "postgresql://fly-user:fMj14FwiQy2vgVvqwXx2BBKV@pgbouncer.9g6y30wgvkmrv5ml.flympg.net/fly-db?sslmode=disable" });

async function run() {
  try {
    const hash = await bcrypt.hash('password123', 12);
    // Delete test.user if exists
    await pool.query("DELETE FROM users WHERE username='test.user'");
    // Insert new test.user
    await pool.query(
      'INSERT INTO users (name, username, email, phone, address, password_hash, must_change_password, created_by) VALUES ($1, $2, $3, $4, $5, $6, false, $7)',
      ['Test User', 'test.user', 'test@example.com', '+94700000000', 'Test Address', hash, 'admin']
    );
    console.log('✅ Created test.user on Fly DB');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
run();
