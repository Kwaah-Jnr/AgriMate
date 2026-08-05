require('dotenv').config({ path: './AgriMate-backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  try {
    const client = await pool.connect();
    
    // 1. Get enum values for user_role
    const enumRes = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = 'user_role'::regtype
    `);
    console.log('Enum values for user_role:', enumRes.rows.map(r => r.enumlabel));

    // 2. Get table column definitions for users
    const usersCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log('Users table columns:', usersCols.rows.map(r => `${r.column_name}: ${r.data_type}`));

    // 3. Get table column definitions for roles
    const rolesCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles'
    `);
    console.log('Roles table columns:', rolesCols.rows.map(r => `${r.column_name}: ${r.data_type}`));

    client.release();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
