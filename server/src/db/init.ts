import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function initDB() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();

    console.log('Running schema.sql...');
    const schemaPath = path.join(__dirname, '../../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schemaSql);
    console.log('Schema created successfully.');

    console.log('Seeding test user...');
    // The admin username is fixed as per requirement ('admin' / '123')
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const rawPassword = '123';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const checkAdmin = await client.query('SELECT * FROM users WHERE username = $1', [adminUsername]);
    
    if (checkAdmin.rows.length === 0) {
      await client.query(`
        INSERT INTO users (name, username, password_hash, must_change_password, created_by)
        VALUES ($1, $2, $3, $4, $5)
      `, ['Administrator', adminUsername, passwordHash, false, 'system']);
      console.log(`Test user '${adminUsername}' created successfully.`);
    } else {
      console.log(`User '${adminUsername}' already exists. Skipping seed.`);
    }

    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDB();
