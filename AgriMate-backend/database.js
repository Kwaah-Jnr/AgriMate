require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 10,                         // Allows higher concurrent query throughput
  idleTimeoutMillis: 30000,        // B20 fix: bumped from 5000 — don't close idle connections too quickly
  connectionTimeoutMillis: 10000,  // B20 fix: bumped from 2000 — Supabase remote pooler needs more time
});  

// Error handler to prevent idle client connection losses from crashing the server process
pool.on('error', (err, client) => {
  console.error('❌ Unexpected database pool error:', err.message);
});

// Bind error handlers to individual clients on connection to prevent unhandled crashes
pool.on('connect', (client) => {
  client.on('error', (err) => {
    console.error('❌ Database client error:', err.message);
  });
});

module.exports = pool;