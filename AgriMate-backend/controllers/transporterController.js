const pool = require("../database");

// Helper to lazily create or fetch a wallet
async function getOrCreateWallet(client, userId) {
  const existing = await client.query("SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE", [userId]);
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }
  const created = await client.query(
    "INSERT INTO wallets (user_id, balance, escrow_balance) VALUES ($1, 0.00, 0.00) RETURNING *",
    [userId]
  );
  return created.rows[0];
}

// Helper to log actions into history
async function logHistory(client, userId, actionType, referenceId, description) {
  await client.query(
    "INSERT INTO history (user_id, action_type, reference_id, description) VALUES ($1, $2, $3, $4)",
    [userId, actionType, referenceId, description]
  );
}

/**
 * Dynamic Road Distance & Shipping Rate Estimator
 */
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // 1.35x factor for Ghana road network winding
  return Math.max(R * c * 1.35, 5.0);
}

function calculateRoadDistanceAndPayout(originAddress, destinationAddress, estimatedKm, coords) {
  let distanceKm = parseFloat(estimatedKm) || 25.0;

  if (coords && coords.originLat && coords.originLng && coords.destLat && coords.destLng) {
    distanceKm = calculateHaversineDistanceKm(
      parseFloat(coords.originLat),
      parseFloat(coords.originLng),
      parseFloat(coords.destLat),
      parseFloat(coords.destLng)
    );
  }

  const baseRate = 25.0; // GH₵ base handling fee
  const perKmRate = 4.5; // GH₵ per km driving rate
  const calculatedPayout = baseRate + (distanceKm * perKmRate);
  const estimatedMins = Math.round((distanceKm / 45) * 60); // Assuming average 45km/h speed

  return {
    distanceKm: parseFloat(distanceKm.toFixed(1)),
    estimatedPayout: parseFloat(calculatedPayout.toFixed(2)),
    estimatedMins,
    ratePerKm: perKmRate,
    baseFee: baseRate,
  };
}

exports.calculateJobQuote = async (req, res) => {
  const { pickup_location, dropoff_location, distance_km, origin_lat, origin_lng, dest_lat, dest_lng } = req.body;
  try {
    const coords = (origin_lat && origin_lng && dest_lat && dest_lng)
      ? { originLat: origin_lat, originLng: origin_lng, destLat: dest_lat, destLng: dest_lng }
      : null;
    const quote = calculateRoadDistanceAndPayout(pickup_location, dropoff_location, distance_km, coords);
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: "Failed to calculate distance quote" });
  }
};

/* ==========================================================================
   1. Job Discovery & Assignment
   ========================================================================== */

exports.getAvailableJobs = async (req, res) => {
  const { region } = req.query;

  try {
    let query = `
      SELECT j.job_id, j.distance_km, j.payout, j.status as job_status, 
              l.crop_name, l.grade, l.location as pickup_location,
              u.username as farmer_name, u.region as farmer_region
       FROM jobs j
       JOIN orders o ON j.order_id = o.order_id
       JOIN listings l ON o.listings_id = l.listing_id
       JOIN users u ON l.user_id = u.user_id
       WHERE j.status = 'available'
    `;
    const params = [];

    if (region) {
      params.push(region);
      query += ` AND u.region = $1`;
    }

    query += " ORDER BY j.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching available jobs:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.claimJob = async (req, res) => {
  const jobId = req.params.id;
  const transporterId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check job availability
    const check = await client.query("SELECT * FROM jobs WHERE job_id = $1", [jobId]);
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Logistics job not found." });
    }
    const job = check.rows[0];

    if (job.status !== "available") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Cannot claim job. Job status is '${job.status}'.` });
    }

    // 1. Claim job
    await client.query(
      "UPDATE jobs SET transporter_id = $1, status = 'assigned', updated_at = NOW() WHERE job_id = $2",
      [transporterId, jobId]
    );

    // 2. Update order status and record delivery_status and transporter_vehicle
    await client.query(
      "UPDATE orders SET status = 'assigned', delivery_status = 'claimed', transporter_vehicle = $1, updated_at = NOW() WHERE order_id = $2",
      [req.user.vehicleNumber || null, job.order_id]
    );

    // 3. Log history
    await logHistory(client, transporterId, "job_claimed", jobId, `Claimed logistics job ID ${jobId} (order ${job.order_id})`);

    await client.query("COMMIT");
    res.json({ message: "Logistics job claimed successfully.", job_id: jobId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error claiming job:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

/* ==========================================================================
   2. Delivery Workflow
   ========================================================================== */

exports.confirmPickup = async (req, res) => {
  const jobId = req.params.id;
  const { qr_code } = req.body;
  const transporterId = req.user.user_id;

  if (!qr_code) {
    return res.status(400).json({ error: "QR code payload is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify job belongs to transporter and status is assigned
    const check = await client.query("SELECT * FROM jobs WHERE job_id = $1", [jobId]);
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Job not found." });
    }
    const job = check.rows[0];

    if (job.transporter_id !== transporterId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You are not assigned to this job." });
    }

    if (job.status !== "assigned") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Handoff invalid. Job is in '${job.status}' state.` });
    }

    // Verify QR code matches
    if (job.qr_pickup !== qr_code) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid QR Code for pickup verification." });
    }

    // 1. Update job status
    await client.query("UPDATE jobs SET status = 'picked_up', updated_at = NOW() WHERE job_id = $1", [jobId]);

    // Fetch order and farmer info
    const orderQuery = await client.query(
      `SELECT o.*, l.user_id as farmer_id 
       FROM orders o 
       JOIN listings l ON o.listings_id = l.listing_id 
       WHERE o.order_id = $1`,
      [job.order_id]
    );
    const order = orderQuery.rows[0];
    const farmerId = order.farmer_id;
    const orderTotal = parseFloat(order.price) * parseInt(order.quantity);
    const releaseAmount = orderTotal * 0.5;

    let escrowReleased = false;

    if (order.escrow_status === 'funded') {
      // Release 50% escrow to farmer
      const farmerWallet = await getOrCreateWallet(client, farmerId);
      const newFarmerEscrow = Math.max(0, parseFloat(farmerWallet.escrow_balance) - releaseAmount);
      const newFarmerBalance = parseFloat(farmerWallet.balance) + releaseAmount;
      await client.query(
        "UPDATE wallets SET balance = $1, escrow_balance = $2, updated_at = NOW() WHERE user_id = $3",
        [newFarmerBalance, newFarmerEscrow, farmerId]
      );

      // Decrement buyer's escrow balance
      const buyerWallet = await getOrCreateWallet(client, order.buyer_id);
      const newBuyerEscrow = Math.max(0, parseFloat(buyerWallet.escrow_balance) - releaseAmount);
      await client.query(
        "UPDATE wallets SET escrow_balance = $1, updated_at = NOW() WHERE user_id = $2",
        [newBuyerEscrow, order.buyer_id]
      );

      // Update order status, escrow_status = half_released, delivery_status = transit
      await client.query(
        "UPDATE orders SET status = 'picked_up', escrow_status = 'half_released', delivery_status = 'transit', updated_at = NOW() WHERE order_id = $1",
        [job.order_id]
      );

      // Create release payments record
      await client.query(
        `INSERT INTO payments (order_id, buyer_id, amount, type, status, description) 
         VALUES ($1, $2, $3, 'release', 'confirmed', $4)`,
        [job.order_id, order.buyer_id, releaseAmount, `50% escrow released to farmer on transporter pickup.`]
      );

      // Create wallet transaction record for the farmer
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
         VALUES ($1, 'escrow', $2, 'success', $3)`,
        [farmerId, releaseAmount, `50% escrow released on transporter pickup.`]
      );

      await logHistory(client, farmerId, "escrow_half_released", job.order_id, `Released 50% escrow (${releaseAmount} GHS) to farmer balance on transporter pickup.`);
      escrowReleased = true;
    } else {
      // Just update order status and delivery_status to transit
      // Note: If escrow was already half_released (by farmer fulfill), it stays half_released
      const nextEscrowStatus = order.escrow_status === 'half_released' ? 'half_released' : order.escrow_status;
      await client.query(
        "UPDATE orders SET status = 'picked_up', escrow_status = $1, delivery_status = 'transit', updated_at = NOW() WHERE order_id = $2",
        [nextEscrowStatus, job.order_id]
      );
    }

    // 3. Log history
    await logHistory(client, transporterId, "job_pickup_confirmed", jobId, `Confirmed crop pickup for job ID ${jobId}`);

    await client.query("COMMIT");
    res.json({ message: "Pickup confirmed. Crop is in transit.", job_id: jobId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error confirming pickup:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

exports.confirmDelivery = async (req, res) => {
  const jobId = req.params.id;
  const { qr_code } = req.body;
  const transporterId = req.user.user_id;

  if (!qr_code) {
    return res.status(400).json({ error: "QR code payload is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify job belongs to transporter and status is picked_up
    const check = await client.query("SELECT * FROM jobs WHERE job_id = $1", [jobId]);
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Job not found." });
    }
    const job = check.rows[0];

    if (job.transporter_id !== transporterId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You are not assigned to this job." });
    }

    if (job.status !== "picked_up") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Handoff invalid. Job is in '${job.status}' state.` });
    }

    // Verify QR code matches
    if (job.qr_delivery !== qr_code) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid QR Code for delivery verification." });
    }

    // 1. Update job status to delivered
    await client.query("UPDATE jobs SET status = 'delivered', updated_at = NOW() WHERE job_id = $1", [jobId]);

    // 2. Fetch order and farmer info
    const orderQuery = await client.query(
      `SELECT o.*, l.user_id as farmer_id 
       FROM orders o 
       JOIN listings l ON o.listings_id = l.listing_id 
       WHERE o.order_id = $1`,
      [job.order_id]
    );
    const order = orderQuery.rows[0];
    const farmerId = order.farmer_id;
    const orderTotal = parseFloat(order.price) * parseInt(order.quantity);

    // Calculate how much escrow remains to be released
    let releaseAmount = 0.00;
    if (order.escrow_status === 'half_released') {
      releaseAmount = orderTotal * 0.5;
    } else if (order.escrow_status === 'funded') {
      releaseAmount = orderTotal;
    }

    // 3. Update order status, escrow_status, and delivery_status
    await client.query(
      `UPDATE orders 
       SET status = 'delivered', escrow_status = 'released', delivery_status = 'completed', updated_at = NOW() 
       WHERE order_id = $1`,
      [job.order_id]
    );

    // 4. Trigger Escrow Release to Farmer (if there are funds to release)
    if (releaseAmount > 0) {
      const farmerWallet = await getOrCreateWallet(client, farmerId);
      const newFarmerEscrow = Math.max(0, parseFloat(farmerWallet.escrow_balance) - releaseAmount);
      const newFarmerBalance = parseFloat(farmerWallet.balance) + releaseAmount;

      await client.query(
        "UPDATE wallets SET balance = $1, escrow_balance = $2, updated_at = NOW() WHERE user_id = $3",
        [newFarmerBalance, newFarmerEscrow, farmerId]
      );

      // Decrement buyer's escrow balance
      const buyerWallet = await getOrCreateWallet(client, order.buyer_id);
      const newBuyerEscrow = Math.max(0, parseFloat(buyerWallet.escrow_balance) - releaseAmount);
      await client.query(
        "UPDATE wallets SET escrow_balance = $1, updated_at = NOW() WHERE user_id = $2",
        [newBuyerEscrow, order.buyer_id]
      );

      // Create release payments record
      await client.query(
        `INSERT INTO payments (order_id, buyer_id, amount, type, status, description) 
         VALUES ($1, $2, $3, 'release', 'confirmed', $4)`,
        [job.order_id, order.buyer_id, releaseAmount, `Remaining escrow released to farmer on transporter delivery.`]
      );

      // Create wallet transaction record for the farmer
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
         VALUES ($1, 'escrow', $2, 'success', $3)`,
        [farmerId, releaseAmount, `Remaining escrow released on transporter delivery.`]
      );

      await logHistory(client, farmerId, "escrow_released", order.order_id, `Released remaining escrow (${releaseAmount} GHS) to farmer wallet balance for completed order ID ${order.order_id}`);
    }

    // 5. Trigger Transporter Payout
    const transPayout = parseFloat(job.payout) || parseFloat(job.flat_fee) || 100.00;
    const transWallet = await getOrCreateWallet(client, transporterId);
    const newTransBalance = parseFloat(transWallet.balance) + transPayout;

    await client.query(
      "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2",
      [newTransBalance, transporterId]
    );

    // Create wallet transaction record for the transporter payout
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
       VALUES ($1, 'deposit', $2, 'success', $3)`,
      [transporterId, transPayout, `Logistics payout received for job ID ${jobId}.`]
    );

    await logHistory(client, transporterId, "payout_received", jobId, `Received payout of ${transPayout} GHS for completed logistics job ID ${jobId}`);

    await client.query("COMMIT");
    res.json({ message: "Delivery confirmed. Escrow released to farmer and payout transferred to transporter.", job_id: jobId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error confirming delivery:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

/* ==========================================================================
   3. Payments & Payouts
   ========================================================================== */

exports.getEarnings = async (req, res) => {
  const transporterId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT j.job_id, j.job_id as "jobId", j.order_id, j.order_id as "orderId",
              j.distance_km, j.distance_km as "distanceKm",
              j.payout, j.payout as amount,
              j.updated_at as completed_at, j.updated_at as "completedAt",
              l.crop_name, l.crop_name as "cropName", l.grade, l.location as pickup_location,
              f.username as farmer_name, f.username as "farmerName",
              b.username as buyer_name, b.username as "buyerName"
       FROM jobs j
       JOIN orders o ON j.order_id = o.order_id
       JOIN listings l ON o.listings_id = l.listing_id
       JOIN users f ON l.user_id = f.user_id
       JOIN users b ON o.buyer_id = b.user_id
       WHERE j.transporter_id = $1 AND j.status = 'delivered'
       ORDER BY j.updated_at DESC`,
      [transporterId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching earnings:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getWallet = async (req, res) => {
  const userId = req.user.user_id;

  const client = await pool.connect();
  try {
    const wallet = await getOrCreateWallet(client, userId);
    res.json(wallet);
  } catch (err) {
    console.error("❌ Error fetching wallet:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

exports.withdrawFunds = async (req, res) => {
  const userId = req.user.user_id;
  const { amount, phone } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "A valid positive withdrawal amount is required." });
  }
  if (!phone) {
    return res.status(400).json({ error: "A target MoMo phone number is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const wallet = await getOrCreateWallet(client, userId);
    const balance = parseFloat(wallet.balance);

    if (balance < amount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Insufficient balance for withdrawal." });
    }

    const newBalance = balance - amount;
    await client.query("UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2", [newBalance, userId]);
    
    // Log history
    await logHistory(client, userId, "withdraw_momo", wallet.wallet_id, `Withdrew ${amount} GHS to MoMo wallet (${phone})`);

    await client.query("COMMIT");
    res.json({ message: "Withdrawal successful.", new_balance: newBalance });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error withdrawing funds:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

/* ==========================================================================
   4. Ratings & Reputation
   ========================================================================== */

exports.rateUser = async (req, res) => {
  const { rated_user_id, score, comment } = req.body;
  const transporterId = req.user.user_id;

  if (!rated_user_id || !score) {
    return res.status(400).json({ error: "Rated user ID and rating score (1-5) are required." });
  }
  const scoreInt = parseInt(score);
  if (Number.isNaN(scoreInt) || scoreInt < 1 || scoreInt > 5) {
    return res.status(400).json({ error: "Rating score must be an integer between 1 and 5." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify transporter completed a job involving this user
    // (This user must either be the farmer of the listing, or the buyer of the order)
    const tradeCheck = await client.query(
      `SELECT COUNT(*) 
       FROM jobs j
       JOIN orders o ON j.order_id = o.order_id
       JOIN listings l ON o.listings_id = l.listing_id
       WHERE j.transporter_id = $1 AND j.status = 'delivered' AND (l.user_id = $2 OR o.buyer_id = $2)`,
      [transporterId, rated_user_id]
    );

    if (parseInt(tradeCheck.rows[0].count) === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You can only rate a farmer/buyer after completing a delivery job for them." });
    }

    const result = await client.query(
      `INSERT INTO ratings (user_id, rated_user_id, score, comment) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [transporterId, rated_user_id, scoreInt, comment || null]
    );
    const rating = result.rows[0];

    await logHistory(client, transporterId, "rating_submitted", rating.rating_id, `Rated user ID ${rated_user_id} with score ${scoreInt}`);

    await client.query("COMMIT");
    res.status(201).json(rating);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error rating user:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

exports.getRatings = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT r.rating_id, r.score, r.comment, r.created_at, u.username as reviewer_name
       FROM ratings r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.rated_user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching ratings:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ==========================================================================
   5. Analytics
   ========================================================================== */

exports.getAnalytics = async (req, res) => {
  const transporterId = req.user.user_id;

  try {
    // 1. Total jobs completed
    const jobsCount = await pool.query(
      "SELECT COUNT(*) FROM jobs WHERE transporter_id = $1 AND status = 'delivered'",
      [transporterId]
    );

    // 2. Average delivery time in hours (from pickup to delivery)
    const deliveryTimes = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)::DECIMAL(10,2) as avg_hours_to_delivery
       FROM jobs
       WHERE transporter_id = $1 AND status = 'delivered'`,
      [transporterId]
    );

    // 3. Total revenue earned
    const revenueSum = await pool.query(
      "SELECT SUM(payout)::DECIMAL(12,2) as total_earnings FROM jobs WHERE transporter_id = $1 AND status = 'delivered'",
      [transporterId]
    );

    // 4. Available jobs count
    const availJobsCount = await pool.query(
      "SELECT COUNT(*) FROM jobs WHERE status = 'available'"
    );

    // 5. Active deliveries count for transporter
    const activeDelivCount = await pool.query(
      "SELECT COUNT(*) FROM jobs WHERE transporter_id = $1 AND status IN ('assigned', 'picked_up')",
      [transporterId]
    );

    // 6. Transporter wallet balance
    const walletRes = await pool.query(
      "SELECT balance, escrow_balance FROM wallets WHERE user_id = $1",
      [transporterId]
    );
    const walletBalance = walletRes.rows.length > 0 ? parseFloat(walletRes.rows[0].balance) : 0.00;

    const totalJobsCompleted = parseInt(jobsCount.rows[0].count) || 0;
    const totalEarnings = parseFloat(revenueSum.rows[0].total_earnings) || 0.00;

    res.json({
      total_jobs_completed: totalJobsCompleted,
      totalJobsCompleted,
      total_earnings: totalEarnings,
      totalEarnings,
      average_delivery_hours: deliveryTimes.rows[0].avg_hours_to_delivery
        ? parseFloat(deliveryTimes.rows[0].avg_hours_to_delivery)
        : "N/A",
      availableJobs: parseInt(availJobsCount.rows[0].count) || 0,
      activeDeliveries: parseInt(activeDelivCount.rows[0].count) || 0,
      settledBalance: walletBalance,
    });
  } catch (err) {
    console.error("❌ Error fetching transporter analytics:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateJobLocation = async (req, res) => {
  const orderId = req.params.id;
  const transporterId = req.user.user_id;
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Latitude and longitude are required." });
  }

  try {
    // 1. Verify that this transporter is assigned to the job related to this order
    const jobCheck = await pool.query(
      "SELECT 1 FROM jobs WHERE order_id = $1 AND transporter_id = $2",
      [orderId, transporterId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(403).json({ error: "Unauthorized. You are not assigned to this delivery." });
    }

    // 2. Update the order's location
    await pool.query(
      `UPDATE orders 
       SET transporter_latitude = $1, transporter_longitude = $2, location_updated_at = NOW() 
       WHERE order_id = $3`,
      [latitude, longitude, orderId]
    );

    res.json({ message: "Location updated successfully." });
  } catch (err) {
    console.error("❌ Error updating job location:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getActiveJobs = async (req, res) => {
  const transporterId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT j.job_id as id, j.job_id, j.status as job_status, j.distance_km, j.payout, j.flat_fee,
              o.order_id, o.status as order_status, o.escrow_status, o.delivery_status,
              l.crop_name, l.grade,
              f.username as farmer_name, b.username as buyer_name
       FROM jobs j
       JOIN orders o ON j.order_id = o.order_id
       JOIN listings l ON o.listings_id = l.listing_id
       JOIN users f ON l.user_id = f.user_id
       JOIN users b ON o.buyer_id = b.user_id
       WHERE j.transporter_id = $1 AND j.status != 'delivered' AND j.status != 'cancelled'
       ORDER BY j.created_at DESC`,
      [transporterId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching active transporter jobs:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
