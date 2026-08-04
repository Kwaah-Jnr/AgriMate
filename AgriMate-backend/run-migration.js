require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const pool = require('./database');

async function runMigration() {
  const sqlPath = path.resolve(__dirname, '../AgriMate db/full_database_schema_v2.sql');
  console.log(`Reading SQL file from: ${sqlPath}`);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('Executing migration query...');
    await client.query(sql);
    console.log('✅ Migration query executed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
    console.log('Database pool closed.');
  }
}

runMigration();
