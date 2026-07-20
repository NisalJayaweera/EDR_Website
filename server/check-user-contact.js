require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // Find who currently owns this email
    const existing = await pool.query(
      'SELECT id, username, email, phone FROM users WHERE email = $1',
      ['nisalsenuja2003@gmail.com']
    );
    console.log('Users with that email:', existing.rows);

    // Show demo.user current state
    const demo = await pool.query(
      'SELECT id, username, email, phone FROM users WHERE username = $1',
      ['demo.user']
    );
    console.log('demo.user current state:', demo.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
run();
