const { Pool } = require('pg');
require('dotenv').config({ path: './AgriMate-backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Port of frontend toCamel helper
const toCamel = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(toCamel);
  }
  if (obj !== null && typeof obj === 'object') {
    const next = {};
    if ('price' in obj && 'quantity' in obj && !('total' in obj)) {
      const p = parseFloat(obj.price);
      const q = parseFloat(obj.quantity);
      if (!isNaN(p) && !isNaN(q)) {
        next.total = p * q;
      }
    }
    for (const key of Object.keys(obj)) {
      let nextKey = key.replace(/([-_][a-z])/g, (group) =>
        group.toUpperCase().replace('-', '').replace('_', '')
      );
      let val = obj[key];
      if (nextKey === 'grade' && typeof val === 'string') {
        const gradeVal = val.trim().toUpperCase();
        if (gradeVal === 'A' || gradeVal === 'B' || gradeVal === 'C') {
          val = `Grade ${gradeVal}`;
        }
      }
      if (nextKey === 'status' && typeof val === 'string') {
        const isListing = ('cropName' in obj || 'crop_name' in obj) && !('orderId' in obj || 'order_id' in obj || 'buyerId' in obj || 'buyer_id' in obj || 'transporterId' in obj || 'transporter_id' in obj);
        if (isListing) {
          const statusVal = val.trim().toLowerCase();
          if (statusVal === 'open') {
            val = 'active';
          } else if (statusVal === 'accepted') {
            val = 'sold';
          }
        }
      }
      const floatKeys = ['price', 'balance', 'amount', 'escrowBalance', 'settledBalance', 'payout', 'flatFee', 'averageRating', 'farmerRating', 'ratingScore', 'distanceKm'];
      if (floatKeys.includes(nextKey) && val !== null && val !== undefined) {
        val = parseFloat(val);
      }
      if (nextKey === 'listingId' || nextKey === 'orderId' || nextKey === 'jobId' || nextKey === 'ratingId' || nextKey === 'walletId' || nextKey === 'disputeId') {
        next.id = toCamel(val);
      }
      next[nextKey] = toCamel(val);
    }
    return next;
  }
  return obj;
};

(async () => {
  try {
    const result = await pool.query(
      "SELECT * FROM wallet_transactions WHERE user_id = 53 ORDER BY created_at DESC"
    );
    console.log('Database Rows:', result.rows);
    console.log('toCamel Output:', toCamel(result.rows));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
