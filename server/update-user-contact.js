require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const result = await pool.query(
      'UPDATE users SET email = $1, phone = $2 WHERE username = $3 RETURNING id, username, email, phone',
      ['nisalsenuja2003@gmail.com', '+94710310608', 'demo.user']
    );
    if (result.rows.length === 0) {
      console.log('❌ No user found with username: demo.user');
    } else {
      console.log('✅ Updated successfully:', result.rows[0]);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
run();
