require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query('SELECT * FROM users');
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
run();
