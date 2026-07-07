require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const users = await pool.query('SELECT id, name, username, email FROM users');
  console.log('Users in DB:');
  users.rows.forEach(u => console.log(' -', u.username, '|', u.name, '|', u.email));

  const hash = await bcrypt.hash('Demo1234', 12);
  const result = await pool.query(
    'UPDATE users SET password_hash = $1, must_change_password = false WHERE username = $2 RETURNING username, name',
    [hash, 'demo.user']
  );
  if (result.rows.length > 0) {
    console.log('\n✅ Password set for:', result.rows[0].username);
    console.log('   Login with  →  username: demo.user  |  password: Demo1234');
  } else {
    console.log('\nNo user found with username demo.user');
  }
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
