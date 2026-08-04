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
    
    // Get columns, types, and character maximum lengths for users table
    const usersCols = await client.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log('Users table columns:');
    usersCols.rows.forEach(r => {
      console.log(`- ${r.column_name}: ${r.data_type} (${r.character_maximum_length || 'no limit'})`);
    });

    client.release();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
