require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const hash = await bcrypt.hash('12345678', 12);
    
    // Check if user exists
    const check = await pool.query('SELECT * FROM users WHERE username = $1', ['demo.user']);
    if (check.rows.length > 0) {
      // Update
      await pool.query(
        'UPDATE users SET password_hash = $1, must_change_password = false WHERE username = $2',
        [hash, 'demo.user']
      );
      console.log('✅ Password updated for existing user demo.user');
    } else {
      // Insert
      await pool.query(
        'INSERT INTO users (name, username, email, role, password_hash, must_change_password) VALUES ($1, $2, $3, $4, $5, false)',
        ['Demo User', 'demo.user', 'demo@example.com', 'user', hash]
      );
      console.log('✅ Created new user demo.user with the requested password');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
run();
