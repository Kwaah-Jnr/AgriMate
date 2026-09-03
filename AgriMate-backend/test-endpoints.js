require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const pool = require('./database');

const BASE_URL = 'http://localhost:' + (process.env.PORT || '5000');

async function runTests() {
  console.log('🧪 Starting AgriMate End-to-End JWT & Escrow Integration Tests...\n');

  const userIds = [];
  const createdListings = [];
  const createdOrders = [];
  const createdJobs = [];

  let farmerToken, buyerToken, transporterToken;
  let farmerId, buyerId, transporterId;
  let farmerEmail, buyerEmail, transporterEmail;

  try {
    // -------------------------------------------------------------
    // 1. Onboarding (Registration & Login)
    // -------------------------------------------------------------
    console.log('--- 1. Registering & Logging In Test Users ---');
    
    farmerEmail = 'farmer_' + Date.now() + '@test.com';
    buyerEmail = 'buyer_' + Date.now() + '@test.com';
    transporterEmail = 'transporter_' + Date.now() + '@test.com';

    // Farmer Registration
    const farmerRegRes = await fetch(`${BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Farmer ' + Date.now(),
        email: farmerEmail,
        phone: '024' + Math.floor(1000000 + Math.random() * 9000000),
        region: 'Ashanti',
        password: 'password123',
        role: 'farmer'
      })
    });
    const farmerRegData = await farmerRegRes.json();
    if (!farmerRegRes.ok) throw new Error('Farmer registration failed: ' + JSON.stringify(farmerRegData));
    farmerId = farmerRegData.user.user_id;
    userIds.push(farmerId);
    console.log(`✅ Registered Farmer (ID: ${farmerId})`);

    // Buyer Registration
    const buyerRegRes = await fetch(`${BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Buyer ' + Date.now(),
        email: buyerEmail,
        phone: '024' + Math.floor(1000000 + Math.random() * 9000000),
        region: 'Greater Accra',
        password: 'password123',
        role: 'buyer'
      })
    });
    const buyerRegData = await buyerRegRes.json();
    if (!buyerRegRes.ok) throw new Error('Buyer registration failed: ' + JSON.stringify(buyerRegData));
    buyerId = buyerRegData.user.user_id;
    userIds.push(buyerId);
    console.log(`✅ Registered Buyer (ID: ${buyerId})`);

    // Transporter Registration (with vehicle number)
    const transporterRegRes = await fetch(`${BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Transporter ' + Date.now(),
        email: transporterEmail,
        phone: '024' + Math.floor(1000000 + Math.random() * 9000000),
        region: 'Ashanti',
        password: 'password123',
        role: 'transporter',
        vehicleNumber: 'GT-505-26'
      })
    });
    const transporterRegData = await transporterRegRes.json();
    if (!transporterRegRes.ok) throw new Error('Transporter registration failed: ' + JSON.stringify(transporterRegData));
    transporterId = transporterRegData.user.user_id;
    userIds.push(transporterId);
    console.log(`✅ Registered Transporter (ID: ${transporterId})`);

    // Logging in Farmer
    const farmerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: farmerEmail, pin: 'password123' })
    });
    const farmerLoginData = await farmerLoginRes.json();
    farmerToken = farmerLoginData.token;
    console.log(`✅ Farmer Logged In (JWT obtained)`);

    // Logging in Buyer
    const buyerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: buyerEmail, pin: 'password123' })
    });
    const buyerLoginData = await buyerLoginRes.json();
    buyerToken = buyerLoginData.token;
    console.log(`✅ Buyer Logged In (JWT obtained)`);

    // Logging in Transporter
    const transporterLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: transporterEmail, pin: 'password123' })
    });
    const transporterLoginData = await transporterLoginRes.json();
    transporterToken = transporterLoginData.token;
    console.log(`✅ Transporter Logged In (JWT obtained)`);

    // Fund Buyer Wallet for tests
    await fetch(`${BASE_URL}/api/buyer/wallet/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({ amount: 10000.00, momoNumber: '0240000000', provider: 'MTN' })
    });
    console.log(`💳 Initialized Buyer Wallet Balance (10,000.00 GHS)\n`);

    // -------------------------------------------------------------
    // FLOW 1: Main Transporter Split-Escrow Handoff Flow
    // -------------------------------------------------------------
    console.log('=== FLOW 1: Main Transporter Split-Escrow Handoff Flow ===');
    
    // 1. Farmer creates listing
    const listingRes = await fetch(`${BASE_URL}/api/farmer/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`
      },
      body: JSON.stringify({
        crop_name: 'Cassava',
        quantity: 100,
        price: 20.00,
        grade: 'A',
        location: 'Kumasi',
        image_url: 'http://test.com/cassava.jpg'
      })
    });
    const listingData = await listingRes.json();
    if (!listingRes.ok) throw new Error('Listing 1 creation failed: ' + JSON.stringify(listingData));
    const listingId1 = listingData.listing_id;
    createdListings.push(listingId1);
    console.log(`✅ Listing created (ID: ${listingId1})`);

    // 2. Buyer places offer
    const offerRes = await fetch(`${BASE_URL}/api/buyer/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        listings_id: listingId1,
        price: 20.00,
        quantity: 50,
        pickup_by: '2026-07-15',
        note: 'Fresh cassava'
      })
    });
    const offerData = await offerRes.json();
    if (!offerRes.ok) throw new Error('Offer 1 placement failed: ' + JSON.stringify(offerData));
    const orderId1 = offerData.order_id;
    createdOrders.push(orderId1);
    console.log(`✅ Offer placed (Order ID: ${orderId1})`);

    // 3. Farmer accepts offer (sets status to accepted, escrow_status = unfunded)
    const acceptRes = await fetch(`${BASE_URL}/api/farmer/offers/${orderId1}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`
      }
    });
    const acceptData = await acceptRes.json();
    if (!acceptRes.ok) throw new Error('Accept offer 1 failed: ' + JSON.stringify(acceptData));
    
    // Verify DB states after Acceptance
    let orderCheck = await pool.query('SELECT status, escrow_status, delivery_status FROM orders WHERE order_id = $1', [orderId1]);
    let listingCheck = await pool.query('SELECT quantity, status FROM listings WHERE listing_id = $1', [listingId1]);
    console.log(`✅ Accept verification: order status = "${orderCheck.rows[0].status}" | escrow = "${orderCheck.rows[0].escrow_status}" | delivery = "${orderCheck.rows[0].delivery_status}"`);
    console.log(`✅ Inventory Remainder Verification: listing quantity = ${listingCheck.rows[0].quantity} (Expected: 50) | listing status = "${listingCheck.rows[0].status}" (Expected: "open")`);
    if (orderCheck.rows[0].escrow_status !== 'unfunded') throw new Error('Escrow status should be unfunded!');
    if (parseInt(listingCheck.rows[0].quantity) !== 50 || listingCheck.rows[0].status !== 'open') throw new Error('Inventory deduction verification failed!');

    // 4. Buyer funds escrow
    const fundRes = await fetch(`${BASE_URL}/api/buyer/orders/${orderId1}/fund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({ transaction_id: 'TXN-MOMO-F1-' + Date.now() })
    });
    const fundData = await fundRes.json();
    if (!fundRes.ok) throw new Error('Fund escrow 1 failed: ' + JSON.stringify(fundData));
    console.log(`✅ Escrow funded. Transaction: ${fundData.transaction_id}`);

    // Verify DB states after funding
    orderCheck = await pool.query('SELECT status, escrow_status FROM orders WHERE order_id = $1', [orderId1]);
    console.log(`✅ Fund verification: escrow_status = "${orderCheck.rows[0].escrow_status}"`);
    if (orderCheck.rows[0].escrow_status !== 'funded') throw new Error('Escrow status should be funded!');

    // 5. Farmer marks order ready (fulfills order) -> Triggers 50% release
    const fulfillRes = await fetch(`${BASE_URL}/api/farmer/orders/${orderId1}/fulfill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`
      }
    });
    const fulfillData = await fulfillRes.json();
    if (!fulfillRes.ok) throw new Error('Fulfill order 1 failed: ' + JSON.stringify(fulfillData));
    console.log(`✅ Order marked ready by farmer. Split release triggered.`);

    // Verify wallet after farmer fulfill (50% release: orderTotal = 20 * 50 = 1000 GHS, so 50% = 500 GHS)
    let farmerWallet = await pool.query('SELECT balance, escrow_balance FROM wallets WHERE user_id = $1', [farmerId]);
    console.log(`🌾 Farmer Wallet: Balance = ${farmerWallet.rows[0].balance} GHS (Expected: 500.00) | Escrow = ${farmerWallet.rows[0].escrow_balance} GHS (Expected: 500.00)`);
    if (parseFloat(farmerWallet.rows[0].balance) !== 500.00) throw new Error('Expected 500.00 GHS in farmer balance!');

    // 6. Transporter claims job
    const jobsRes = await fetch(`${BASE_URL}/api/transporter/jobs/available`, {
      headers: { 'Authorization': `Bearer ${transporterToken}` }
    });
    const jobsList = await jobsRes.json();
    const job = jobsList.find(j => j.pickup_location === 'Kumasi');
    if (!job) throw new Error('Job 1 not found in available list');
    const jobId1 = job.job_id;
    createdJobs.push(jobId1);

    const claimRes = await fetch(`${BASE_URL}/api/transporter/jobs/${jobId1}/claim`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${transporterToken}` }
    });
    if (!claimRes.ok) throw new Error('Claim job 1 failed');
    
    // Verify transporter vehicle copy
    orderCheck = await pool.query('SELECT transporter_vehicle, delivery_status FROM orders WHERE order_id = $1', [orderId1]);
    console.log(`🚚 Transporter vehicle on order = "${orderCheck.rows[0].transporter_vehicle}" | delivery = "${orderCheck.rows[0].delivery_status}"`);
    if (orderCheck.rows[0].transporter_vehicle !== 'GT-505-26') throw new Error('Vehicle number not recorded correctly!');

    // Get QR codes
    const qrQuery = await pool.query('SELECT qr_pickup, qr_delivery FROM jobs WHERE job_id = $1', [jobId1]);
    const { qr_pickup, qr_delivery } = qrQuery.rows[0];

    // 7. Transporter pickup (No double release because already half_released)
    const pickupRes = await fetch(`${BASE_URL}/api/transporter/jobs/${jobId1}/confirm-pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${transporterToken}`
      },
      body: JSON.stringify({ qr_code: qr_pickup })
    });
    if (!pickupRes.ok) throw new Error('Pickup confirmation failed');

    // === Geolocation Integration Tests ===
    console.log('📍 Testing Transporter Geolocation Updates & Fetching...');
    
    const locPostRes = await fetch(`${BASE_URL}/api/transporter/jobs/${orderId1}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${transporterToken}`
      },
      body: JSON.stringify({ latitude: 5.6037, longitude: -0.1870 })
    });
    const locPostData = await locPostRes.json();
    if (!locPostRes.ok) throw new Error('Post transporter location failed: ' + JSON.stringify(locPostData));
    console.log('✅ Geolocation: Posted coordinates from Transporter successfully');

    const buyerLocRes = await fetch(`${BASE_URL}/api/buyer/orders/${orderId1}/location`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    const buyerLocData = await buyerLocRes.json();
    if (!buyerLocRes.ok) throw new Error('Fetch location from Buyer failed: ' + JSON.stringify(buyerLocData));
    console.log(`✅ Geolocation: Buyer successfully fetched coordinates: ${buyerLocData.latitude}, ${buyerLocData.longitude}`);
    if (buyerLocData.latitude !== 5.6037 || buyerLocData.longitude !== -0.1870) {
      throw new Error('Coordinates mismatch on buyer fetch!');
    }

    const farmerLocRes = await fetch(`${BASE_URL}/api/farmer/orders/${orderId1}/location`, {
      headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const farmerLocData = await farmerLocRes.json();
    if (!farmerLocRes.ok) throw new Error('Fetch location from Farmer failed: ' + JSON.stringify(farmerLocData));
    console.log(`✅ Geolocation: Farmer successfully fetched coordinates: ${farmerLocData.latitude}, ${farmerLocData.longitude}`);
    if (farmerLocData.latitude !== 5.6037 || farmerLocData.longitude !== -0.1870) {
      throw new Error('Coordinates mismatch on farmer fetch!');
    }

    // Verify no double release occurred
    farmerWallet = await pool.query('SELECT balance, escrow_balance FROM wallets WHERE user_id = $1', [farmerId]);
    console.log(`🌾 Farmer Wallet (after pickup): Balance = ${farmerWallet.rows[0].balance} GHS (Expected: 500.00)`);
    if (parseFloat(farmerWallet.rows[0].balance) !== 500.00) throw new Error('Double release detected! Farmer balance increased!');

    orderCheck = await pool.query('SELECT escrow_status, delivery_status FROM orders WHERE order_id = $1', [orderId1]);
    console.log(`📦 Order (after pickup): escrow = "${orderCheck.rows[0].escrow_status}" | delivery = "${orderCheck.rows[0].delivery_status}"`);

    // 8. Transporter delivery (Triggers remaining 50% release and transporter payout)
    const deliveryRes = await fetch(`${BASE_URL}/api/transporter/jobs/${jobId1}/confirm-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${transporterToken}`
      },
      body: JSON.stringify({ qr_code: qr_delivery })
    });
    if (!deliveryRes.ok) throw new Error('Delivery confirmation failed');

    // Verify final release
    farmerWallet = await pool.query('SELECT balance, escrow_balance FROM wallets WHERE user_id = $1', [farmerId]);
    console.log(`🌾 Farmer Wallet (final): Balance = ${farmerWallet.rows[0].balance} GHS (Expected: 1000.00) | Escrow = ${farmerWallet.rows[0].escrow_balance} GHS (Expected: 0)`);
    if (parseFloat(farmerWallet.rows[0].balance) !== 1000.00) throw new Error('Escrow release failed!');

    // Verify transporter wallet (distance base payout or flat fee)
    const transWallet = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [transporterId]);
    console.log(`🚚 Transporter Wallet: Balance = ${transWallet.rows[0].balance} GHS`);
    if (parseFloat(transWallet.rows[0].balance) <= 0) throw new Error('Transporter was not paid!');

    orderCheck = await pool.query('SELECT escrow_status, delivery_status FROM orders WHERE order_id = $1', [orderId1]);
    console.log(`📦 Order (final): escrow = "${orderCheck.rows[0].escrow_status}" | delivery = "${orderCheck.rows[0].delivery_status}"\n`);


    // -------------------------------------------------------------
    // FLOW 2: Buyer Self-Pickup Flow
    // -------------------------------------------------------------
    console.log('=== FLOW 2: Buyer Self-Pickup Flow ===');

    // 1. Farmer creates listing
    const listingRes2 = await fetch(`${BASE_URL}/api/farmer/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`
      },
      body: JSON.stringify({ crop_name: 'Maize', quantity: 20, price: 15.00, location: 'Kumasi' })
    });
    const listingId2 = (await listingRes2.json()).listing_id;
    createdListings.push(listingId2);

    // 2. Buyer places offer
    const offerRes2 = await fetch(`${BASE_URL}/api/buyer/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({ listings_id: listingId2, price: 15.00, quantity: 20 })
    });
    const orderId2 = (await offerRes2.json()).order_id;
    createdOrders.push(orderId2);

    // 3. Accept offer
    await fetch(`${BASE_URL}/api/farmer/offers/${orderId2}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${farmerToken}` }
    });

    // 4. Fund escrow
    await fetch(`${BASE_URL}/api/buyer/orders/${orderId2}/fund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({ transaction_id: 'TXN-MOMO-F2-' + Date.now() })
    });

    // 5. Farmer fulfill (marks ready, triggers 50% release: orderTotal = 15 * 20 = 300 GHS, so 150 GHS released)
    await fetch(`${BASE_URL}/api/farmer/orders/${orderId2}/fulfill`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${farmerToken}` }
    });

    // 6. Buyer bypasses transporter and self-pickups (releases remaining 50%: 150 GHS)
    const selfPickupRes = await fetch(`${BASE_URL}/api/buyer/orders/${orderId2}/self-pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      }
    });
    const selfPickupData = await selfPickupRes.json();
    if (!selfPickupRes.ok) throw new Error('Self pickup failed: ' + JSON.stringify(selfPickupData));
    console.log(`✅ Self-pickup API called successfully!`);

    // Verify DB states after self-pickup
    orderCheck = await pool.query('SELECT status, escrow_status, delivery_status FROM orders WHERE order_id = $1', [orderId2]);
    console.log(`📦 Order: status = "${orderCheck.rows[0].status}" | escrow = "${orderCheck.rows[0].escrow_status}" | delivery = "${orderCheck.rows[0].delivery_status}"`);
    if (orderCheck.rows[0].escrow_status !== 'released' || orderCheck.rows[0].delivery_status !== 'completed') {
      throw new Error('Self-pickup did not release escrow or complete delivery!');
    }

    // Farmer wallet gets remaining 150 GHS (total farmer balance becomes 1000 + 300 = 1300 GHS)
    farmerWallet = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [farmerId]);
    console.log(`🌾 Farmer Wallet (after self-pickup): Balance = ${farmerWallet.rows[0].balance} GHS (Expected: 1300.00)`);
    if (parseFloat(farmerWallet.rows[0].balance) !== 1300.00) throw new Error('Farmer wallet balance verification failed after self-pickup!');
    console.log(`✅ Self-pickup verification succeeded!\n`);


    // -------------------------------------------------------------
    // FLOW 3: Dispute & Refund Flow
    // -------------------------------------------------------------
    console.log('=== FLOW 3: Dispute & Refund Flow ===');

    // 1. Farmer creates listing
    const listingRes3 = await fetch(`${BASE_URL}/api/farmer/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`
      },
      body: JSON.stringify({ crop_name: 'Beans', quantity: 10, price: 50.00, location: 'Kumasi' })
    });
    const listingId3 = (await listingRes3.json()).listing_id;
    createdListings.push(listingId3);

    // 2. Buyer places offer
    const offerRes3 = await fetch(`${BASE_URL}/api/buyer/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({ listings_id: listingId3, price: 50.00, quantity: 10 })
    });
    const orderId3 = (await offerRes3.json()).order_id;
    createdOrders.push(orderId3);

    // 3. Accept offer
    await fetch(`${BASE_URL}/api/farmer/offers/${orderId3}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${farmerToken}` }
    });

    // 4. Fund escrow (orderTotal = 50 * 10 = 500 GHS)
    await fetch(`${BASE_URL}/api/buyer/orders/${orderId3}/fund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({ transaction_id: 'TXN-MOMO-F3-' + Date.now() })
    });

    // 5. Buyer raises dispute (escrow frozen)
    const disputeRes = await fetch(`${BASE_URL}/api/buyer/orders/${orderId3}/dispute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({ reason: 'Quality does not match grade A specifications.' })
    });
    const disputeData = await disputeRes.json();
    if (!disputeRes.ok) throw new Error('Dispute failed to raise: ' + JSON.stringify(disputeData));
    console.log(`✅ Dispute raised. Reason: "${disputeData.reason}"`);

    // Verify escrow is frozen
    orderCheck = await pool.query('SELECT status, escrow_status FROM orders WHERE order_id = $1', [orderId3]);
    console.log(`📦 Order: status = "${orderCheck.rows[0].status}" | escrow = "${orderCheck.rows[0].escrow_status}"`);
    if (orderCheck.rows[0].escrow_status !== 'disputed') throw new Error('Escrow status was not set to disputed!');

    // 6. Resolve dispute with 'refund' (returns 100% of escrow back to buyer)
    const resolveRes = await fetch(`${BASE_URL}/api/buyer/orders/${orderId3}/resolve-dispute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({ action: 'refund' })
    });
    const resolveData = await resolveRes.json();
    if (!resolveRes.ok) throw new Error('Dispute resolution failed: ' + JSON.stringify(resolveData));
    console.log(`✅ Dispute resolved with action: refund.`);

    // Verify order status and buyer's wallet refund
    orderCheck = await pool.query('SELECT status, escrow_status, delivery_status FROM orders WHERE order_id = $1', [orderId3]);
    console.log(`📦 Order (after dispute refund): status = "${orderCheck.rows[0].status}" | escrow = "${orderCheck.rows[0].escrow_status}" | delivery = "${orderCheck.rows[0].delivery_status}"`);
    if (orderCheck.rows[0].escrow_status !== 'refunded' || orderCheck.rows[0].delivery_status !== 'cancelled') {
      throw new Error('Order status and delivery status were not cancelled/refunded correctly!');
    }

    const buyerWallet = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [buyerId]);
    console.log(`💳 Buyer Wallet: Balance = ${buyerWallet.rows[0].balance} GHS (Expected: 8700.00 after refund)`);
    if (parseFloat(buyerWallet.rows[0].balance) !== 8700.00) throw new Error('Buyer wallet was not credited with the refunded amount!');
    console.log(`✅ Dispute and refund verification succeeded!\n`);

    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! The JWT Auth, Escrow splits, Self-pickup, and Dispute Resolution flows are fully correct.');

  } catch (error) {
    console.error('❌ Integration Test Failed!');
    console.error(error.message);
  } finally {
    console.log('\n--- Cleaning Up Test Data ---');
    // Clean up created entities to prevent pollution
    if (createdJobs.length > 0) {
      await pool.query('DELETE FROM jobs WHERE job_id = ANY($1)', [createdJobs]);
      console.log('... Cleaned up logistics jobs');
    }
    if (createdOrders.length > 0) {
      await pool.query('DELETE FROM disputes WHERE order_id = ANY($1)', [createdOrders]);
      await pool.query('DELETE FROM payments WHERE order_id = ANY($1)', [createdOrders]);
      await pool.query('DELETE FROM orders WHERE order_id = ANY($1)', [createdOrders]);
      console.log('... Cleaned up orders, payments, disputes');
    }
    if (createdListings.length > 0) {
      await pool.query('DELETE FROM listings WHERE listing_id = ANY($1)', [createdListings]);
      console.log('... Cleaned up crop listings');
    }
    if (userIds.length > 0) {
      await pool.query('DELETE FROM ratings WHERE user_id = ANY($1) OR rated_user_id = ANY($1)', [userIds]);
      await pool.query('DELETE FROM history WHERE user_id = ANY($1)', [userIds]);
      await pool.query('DELETE FROM wallet_transactions WHERE user_id = ANY($1)', [userIds]);
      await pool.query('DELETE FROM wallets WHERE user_id = ANY($1)', [userIds]);
      await pool.query('DELETE FROM roles WHERE user_id = ANY($1)', [userIds]);
      await pool.query('DELETE FROM users WHERE user_id = ANY($1)', [userIds]);
      console.log('... Cleaned up test user accounts, wallets, history logs, and ratings');
    }
    console.log('\n✅ Cleanup complete. Database restored to original state.');
    await pool.end();
  }
}

runTests();
