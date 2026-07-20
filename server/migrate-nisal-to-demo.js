require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete nisal account (cascades to devices, readings etc if FK is set)
    const del = await client.query(
      "DELETE FROM users WHERE username = 'nisal' RETURNING id, username"
    );
    console.log('🗑️  Deleted user:', del.rows[0]);

    // Update demo.user contact info
    const upd = await client.query(
      "UPDATE users SET email = $1, phone = $2 WHERE username = 'demo.user' RETURNING id, username, email, phone",
      ['nisalsenuja2003@gmail.com', '+94710310608']
    );
    console.log('✅ Updated demo.user:', upd.rows[0]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error (rolled back):', err.message);
  } finally {
    client.release();
    pool.end();
  }
}
run();
