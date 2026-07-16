require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT id, name, username, email, phone, created_at FROM users WHERE username != 'admin' ORDER BY created_at DESC");
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
run();
