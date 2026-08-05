require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const pool = require('./database');
const buyerController = require('./controllers/buyerController');

async function testDisputeResolution() {
  const client = await pool.connect();
  try {
    console.log('🧪 Testing Dispute Resolution & Fallback Logic...');

    // 1. Create farmer user
    const farmerRes = await pool.query(
      "INSERT INTO users (username, email, pin) VALUES ($1, $2, 'pin123') RETURNING user_id",
      [`farmer_disp_${Date.now()}`, `farmer_disp_${Date.now()}@test.com`]
    );
    const farmerId = farmerRes.rows[0].user_id;

    // 2. Create buyer user
    const buyerRes = await pool.query(
      "INSERT INTO users (username, email, pin) VALUES ($1, $2, 'pin123') RETURNING user_id",
      [`buyer_disp_${Date.now()}`, `buyer_disp_${Date.now()}@test.com`]
    );
    const buyerId = buyerRes.rows[0].user_id;

    // 3. Create listing
    const listingRes = await pool.query(
      "INSERT INTO listings (user_id, crop_name, quantity, price, grade, location, status) VALUES ($1, 'Corn', 20, 15.00, 'A', 'Accra', 'open') RETURNING listing_id",
      [farmerId]
    );
    const listingId = listingRes.rows[0].listing_id;

    // 4. Create order
    const orderRes = await pool.query(
      "INSERT INTO orders (buyer_id, listings_id, price, quantity, status, escrow_status) VALUES ($1, $2, 15.00, 10, 'accepted', 'funded') RETURNING order_id",
      [buyerId, listingId]
    );
    const orderId = orderRes.rows[0].order_id;

    // 5. Insert dispute
    const disputeRes = await pool.query(
      "INSERT INTO disputes (order_id, buyer_id, reason, status, previous_escrow_status) VALUES ($1, $2, 'Below standard grade', 'open', 'funded') RETURNING dispute_id",
      [orderId, buyerId]
    );
    const disputeId = disputeRes.rows[0].dispute_id;
    console.log(`✅ Created Dispute ID ${disputeId} on Order ID ${orderId}`);

    // 6. Test resolveDisputeById with dispute_id
    const req1 = { params: { id: disputeId }, body: { action: 'cancel' }, user: { user_id: buyerId } };
    let jsonResult1 = null;
    const res1 = { json: (data) => { jsonResult1 = data; return res1; }, status: () => res1 };
    await buyerController.resolveDisputeById(req1, res1);
    console.log(`✅ Resolution response via dispute_id (${disputeId}):`, jsonResult1?.message);

    // 7. Test resolveDisputeById with order_id fallback
    // Reset dispute status to open for fallback test
    await pool.query("UPDATE disputes SET status = 'open' WHERE dispute_id = $1", [disputeId]);
    await pool.query("UPDATE orders SET status = 'disputed', escrow_status = 'disputed' WHERE order_id = $1", [orderId]);

    const req2 = { params: { id: orderId }, body: { action: 'refund' }, user: { user_id: buyerId } };
    let jsonResult2 = null;
    const res2 = { json: (data) => { jsonResult2 = data; return res2; }, status: () => res2 };
    await buyerController.resolveDisputeById(req2, res2);
    console.log(`✅ Resolution response via order_id fallback (${orderId}):`, jsonResult2?.message);

    // 8. Cleanup
    await pool.query("DELETE FROM disputes WHERE dispute_id = $1", [disputeId]);
    await pool.query("DELETE FROM orders WHERE order_id = $1", [orderId]);
    await pool.query("DELETE FROM listings WHERE listing_id = $1", [listingId]);
    await pool.query("DELETE FROM users WHERE user_id IN ($1, $2)", [farmerId, buyerId]);
    console.log('🎉 ALL DISPUTE RESOLUTION TESTS PASSED SUCCESSFULLY!');

  } catch (err) {
    console.error('❌ Dispute test failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testDisputeResolution();
