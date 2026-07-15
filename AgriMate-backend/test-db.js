require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const { Pool } = require('pg');

// This file is for testing the database connection and query execution
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function testDatabase() {
  try {
    // 1. Try to connect to the database
    const client = await pool.connect();
    console.log('Database connection successful!');

    //2. Run a simple query to test if we can execute queries
    const res = await client.query("SELECT NOW() as current_time");
    console.log("🕑 Database Time:", res.rows[0].current_time);

    // 3. Release the client back to the pool
    client.release();
  } catch (err) {
    console.error("❌ Error executing query");
    console.error("Error details:", err.message);
  } finally {
    await pool.end();
  }
}

testDatabase();