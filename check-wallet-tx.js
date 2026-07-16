const { Pool } = require('pg');
require('dotenv').config({ path: './AgriMate-backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

(async () => {
  try {
    const result = await pool.query("SELECT * FROM wallet_transactions LIMIT 5");
    console.log('Wallet Transactions Rows:', result.rows);
    console.log('Columns:', result.fields.map(f => f.name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
