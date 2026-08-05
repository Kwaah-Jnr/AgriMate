require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const pool = require('./database');

async function resetDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔄 Resetting database to fresh state...');
    await client.query('BEGIN');

    // Truncate all data tables with CASCADE to reset all users and dependent records
    const tables = [
      'payments',
      'wallet_transactions',
      'disputes',
      'jobs',
      'ratings',
      'history',
      'orders',
      'offers',
      'listings',
      'wallets',
      'roles',
      'users'
    ];

    for (const table of tables) {
      try {
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
        console.log(`  ✅ Cleared table: ${table}`);
      } catch (err) {
        console.log(`  ⚠️ Notice for ${table}: ${err.message}`);
      }
    }

    await client.query('COMMIT');
    console.log('✨ Database reset complete! All user accounts and app data have been cleared.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to reset database:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase();
