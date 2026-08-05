require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const pool = require('./database');
const farmerController = require('./controllers/farmerController');
const buyerController = require('./controllers/buyerController');
const userController = require('./controllers/userController');

async function testInventoryLogic() {
  const client = await pool.connect();
  try {
    console.log('🧪 Testing Direct Inventory Deduction Controller Logic...');

    // 1. Create farmer user
    const farmerRes = await pool.query(
      "INSERT INTO users (username, email, pin) VALUES ($1, $2, 'pin123') RETURNING user_id",
      [`farmer_inv_${Date.now()}`, `farmer_inv_${Date.now()}@test.com`]
    );
    const farmerId = farmerRes.rows[0].user_id;

    // 2. Create buyer user
    const buyerRes = await pool.query(
      "INSERT INTO users (username, email, pin) VALUES ($1, $2, 'pin123') RETURNING user_id",
      [`buyer_inv_${Date.now()}`, `buyer_inv_${Date.now()}@test.com`]
    );
    const buyerId = buyerRes.rows[0].user_id;

    // 3. Create listing with 20 bags
    const listingRes = await pool.query(
      "INSERT INTO listings (user_id, crop_name, quantity, price, grade, location, status) VALUES ($1, 'Corn', 20, 15.00, 'A', 'Accra', 'open') RETURNING listing_id",
      [farmerId]
    );
    const listingId = listingRes.rows[0].listing_id;
    console.log(`✅ Created initial listing ID ${listingId} with 20 bags (status: 'open').`);

    // 4. Buyer places offer for 10 bags
    const orderRes = await pool.query(
      "INSERT INTO orders (buyer_id, listings_id, price, quantity, status) VALUES ($1, $2, 15.00, 10, 'pending') RETURNING order_id",
      [buyerId, listingId]
    );
    const orderId = orderRes.rows[0].order_id;
    console.log(`✅ Placed offer ID ${orderId} for 10 bags.`);

    // 5. Simulate req/res for acceptOffer controller call
    const req = {
      params: { id: orderId },
      user: { user_id: farmerId }
    };
    let responseData = null;
    const res = {
      json: (data) => { responseData = data; return res; },
      status: (code) => res
    };

    await farmerController.acceptOffer(req, res);

    // 6. Check listing in DB after offer accepted
    const checkListing = await pool.query("SELECT quantity, status FROM listings WHERE listing_id = $1", [listingId]);
    const listingRow = checkListing.rows[0];
    console.log(`🌾 DB Listing Result after 10-bag acceptance: Quantity = ${listingRow.quantity} | Status = '${listingRow.status}'`);

    if (parseInt(listingRow.quantity) === 10 && listingRow.status === 'open') {
      console.log('🎉 SUCCESS: 10 bags deducted, 10 bags remainder remain available (status: open)!');
    } else {
      throw new Error(`FAILED: expected quantity 10 & status 'open', got quantity ${listingRow.quantity} & status '${listingRow.status}'`);
    }

    // 7. Cleanup
    await pool.query("DELETE FROM orders WHERE order_id = $1", [orderId]);
    await pool.query("DELETE FROM listings WHERE listing_id = $1", [listingId]);
    await pool.query("DELETE FROM users WHERE user_id IN ($1, $2)", [farmerId, buyerId]);
    console.log('✅ Cleanup finished.');

  } catch (err) {
    console.error('❌ Test error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testInventoryLogic();
