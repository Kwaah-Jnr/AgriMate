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
    
    const usersRes = await client.query(`
      SELECT u.user_id, u.username, u.email, u.phone_number, u.vehicle_number, r.role 
      FROM users u
      LEFT JOIN roles r ON u.user_id = r.user_id
      ORDER BY u.user_id DESC
      LIMIT 10
    `);
    console.log('Recent 10 users in DB:');
    console.log(usersRes.rows);

    client.release();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
