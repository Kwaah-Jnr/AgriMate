const pool = require("../database");

// Helper to log actions into history
async function logHistory(client, userId, actionType, referenceId, description) {
  await client.query(
    "INSERT INTO history (user_id, action_type, reference_id, description) VALUES ($1, $2, $3, $4)",
    [userId, actionType, referenceId, description]
  );
}

/* ==========================================================================
   1. Listings Discovery
   ========================================================================== */

exports.getListings = async (req, res) => {
  const { crop_name, grade, price_min, price_max, region, limit = 10, offset = 0 } = req.query;

  try {
    let query = `
      SELECT l.*, u.username as farmer_name, u.region as farmer_region 
      FROM listings l
      JOIN users u ON l.user_id = u.user_id
      WHERE l.status = 'open'
    `;
    const params = [];

    if (crop_name) {
      params.push(crop_name);
      query += ` AND l.crop_name = $${params.length}`;
    }

    if (grade) {
      params.push(grade);
      query += ` AND l.grade = $${params.length}`;
    }

    if (price_min) {
      params.push(parseFloat(price_min));
      query += ` AND l.price >= $${params.length}`;
    }

    if (price_max) {
      params.push(parseFloat(price_max));
      query += ` AND l.price <= $${params.length}`;
    }

    if (region) {
      params.push(region);
      query += ` AND u.region = $${params.length}`;
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching active listings for buyer:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getMarketInsights = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT crop_name, 
              AVG(price)::DECIMAL(10,2) as average_price, 
              MIN(price)::DECIMAL(10,2) as minimum_price,
              MAX(price)::DECIMAL(10,2) as maximum_price,
              COUNT(*) as count 
       FROM listings 
       GROUP BY crop_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching market insights:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ==========================================================================
   2. Offers & Orders
   ========================================================================== */

exports.placeOffer = async (req, res) => {
  const { listings_id, listing_id, price, quantity, pickup_by, note } = req.body;
  const buyerId = req.user.user_id;
  const targetListingId = listings_id || listing_id;

  if (!targetListingId || !price || !quantity) {
    return res.status(400).json({ error: "Listing ID, offered price per bag, and offered quantity are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify listing is active and open
    const listingCheck = await client.query("SELECT * FROM listings WHERE listing_id = $1", [targetListingId]);
    if (listingCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Crop listing not found." });
    }
    if (listingCheck.rows[0].status !== "open") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Cannot place offer on a listing with status '${listingCheck.rows[0].status}'.` });
    }

    if (parseInt(quantity) > parseInt(listingCheck.rows[0].quantity)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Requested quantity (${quantity}) exceeds available listing stock (${listingCheck.rows[0].quantity}).` });
    }

    // Insert order/offer
    const result = await client.query(
      `INSERT INTO orders (buyer_id, listings_id, price, quantity, status, pickup_by, note) 
       VALUES ($1, $2, $3, $4, 'pending', $5, $6) 
       RETURNING *`,
      [buyerId, targetListingId, price, quantity, pickup_by || null, note || null]
    );
    const order = result.rows[0];

    // Log history
    await logHistory(client, buyerId, "offer_placed", order.order_id, `Placed offer of ${price} GHS/bag for listing ID ${targetListingId}`);

    await client.query("COMMIT");
    res.status(201).json(order);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error placing offer:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

exports.updateOffer = async (req, res) => {
  const orderId = req.params.id;
  const { price, quantity, pickup_by, note } = req.body;
  const buyerId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify ownership and status
    const check = await client.query("SELECT * FROM orders WHERE order_id = $1", [orderId]);
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Offer not found." });
    }
    if (check.rows[0].buyer_id !== buyerId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You do not own this offer." });
    }
    if (check.rows[0].status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Cannot edit an offer that is already '${check.rows[0].status}'.` });
    }

    const current = check.rows[0];
    const newPrice = price !== undefined ? price : current.price;
    const newQty = quantity !== undefined ? quantity : current.quantity;
    const newPickup = pickup_by !== undefined ? pickup_by : current.pickup_by;
    const newNote = note !== undefined ? note : current.note;

    const result = await client.query(
      `UPDATE orders 
       SET price = $1, quantity = $2, pickup_by = $3, note = $4, updated_at = NOW() 
       WHERE order_id = $5 
       RETURNING *`,
      [newPrice, newQty, newPickup, newNote, orderId]
    );

    await logHistory(client, buyerId, "offer_updated", orderId, `Updated parameters for pending offer ID ${orderId}`);
    
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating offer:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

exports.cancelOffer = async (req, res) => {
  const orderId = req.params.id;
  const buyerId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify ownership and status
    const check = await client.query("SELECT * FROM orders WHERE order_id = $1", [orderId]);
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Offer not found." });
    }
    if (check.rows[0].buyer_id !== buyerId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You do not own this offer." });
    }
    if (check.rows[0].status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Cannot cancel an offer that is already '${check.rows[0].status}'.` });
    }

    await client.query("DELETE FROM orders WHERE order_id = $1", [orderId]);
    await logHistory(client, buyerId, "offer_cancelled", orderId, `Cancelled pending offer ID ${orderId}`);

    await client.query("COMMIT");
    res.json({ message: "Offer cancelled successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error cancelling offer:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

exports.getBuyerOffers = async (req, res) => {
  const buyerId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT o.*, l.crop_name, l.location as listing_location, l.grade, u.username as farmer_name 
       FROM orders o
       JOIN listings l ON o.listings_id = l.listing_id
       JOIN users u ON l.user_id = u.user_id
       WHERE o.buyer_id = $1
       ORDER BY o.created_at DESC`,
      [buyerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching buyer offers:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getOwnOrders = async (req, res) => {
  const buyerId = req.user.user_id;
  const { status, limit = 10, offset = 0 } = req.query;

  try {
    let query = `
      SELECT o.*, l.crop_name, l.location as listing_location, l.grade, u.username as farmer_name 
      FROM orders o
      JOIN listings l ON o.listings_id = l.listing_id
      JOIN users u ON l.user_id = u.user_id
      WHERE o.buyer_id = $1
    `;
    const params = [buyerId];

    if (status) {
      params.push(status);
      query += ` AND o.status = $2`;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching own orders:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ==========================================================================
   3. Payments & Escrow
   ========================================================================== */

exports.fundEscrow = async (req, res) => {
  const orderId = req.params.id;
  const { transaction_id } = req.body;
  const buyerId = req.user.user_id;

  if (!transaction_id) {
    return res.status(400).json({ error: "Mobile Money (MoMo) transaction ID is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify order ownership and status, and get farmer info
    const check = await client.query(
      `SELECT o.*, l.user_id as farmer_id 
       FROM orders o 
       JOIN listings l ON o.listings_id = l.listing_id 
       WHERE o.order_id = $1`,
      [orderId]
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found." });
    }
    const order = check.rows[0];
    if (order.buyer_id !== buyerId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You do not own this order." });
    }
    if (order.status !== "accepted" && order.status !== "ready_for_pickup") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `You can only fund orders in 'accepted' or 'ready_for_pickup' status. Current: '${order.status}'` });
    }

    const orderTotal = parseFloat(order.price) * parseInt(order.quantity);

    // 1. Update payments table record (confirm the lock)
    await client.query(
      `UPDATE payments 
       SET status = 'confirmed', confirmed_at = NOW(), description = $1 
       WHERE order_id = $2 AND type = 'escrow_lock'`,
      [`Escrow funded via MoMo transaction ${transaction_id}.`, orderId]
    );

    // 2. Create a wallet_transactions record for the buyer's escrow funding
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
       VALUES ($1, 'escrow', $2, 'success', $3)`,
      [buyerId, orderTotal, `Escrow funded for order ID ${orderId} via transaction ${transaction_id}.`]
    );

    // 3. Log history for the funding
    await logHistory(client, buyerId, "escrow_funded", orderId, `Funded escrow of ${orderTotal} GHS via transaction ${transaction_id}`);

    // Check if order is already fulfilled / ready_for_pickup
    let finalEscrowStatus = 'funded';
    if (order.status === 'ready_for_pickup') {
      const releaseAmount = orderTotal * 0.5;

      // Update farmer wallet (release 50%)
      const farmerWallet = await getOrCreateWallet(client, order.farmer_id);
      const newFarmerEscrow = Math.max(0, parseFloat(farmerWallet.escrow_balance) - releaseAmount);
      const newFarmerBalance = parseFloat(farmerWallet.balance) + releaseAmount;
      await client.query(
        "UPDATE wallets SET balance = $1, escrow_balance = $2, updated_at = NOW() WHERE user_id = $3",
        [newFarmerBalance, newFarmerEscrow, order.farmer_id]
      );

      // Update order status to ready_for_pickup with half_released escrow
      await client.query(
        "UPDATE orders SET escrow_status = 'half_released', updated_at = NOW() WHERE order_id = $1",
        [orderId]
      );

      // Create release payments record
      await client.query(
        `INSERT INTO payments (order_id, buyer_id, amount, type, status, description) 
         VALUES ($1, $2, $3, 'release', 'confirmed', $4)`,
        [orderId, buyerId, releaseAmount, `50% escrow released on funding (order was already fulfilled).`]
      );

      // Create wallet transaction record for the farmer's release
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
         VALUES ($1, 'escrow', $2, 'success', $3)`,
        [order.farmer_id, releaseAmount, `50% escrow released on order funding.`]
      );

      await logHistory(client, order.farmer_id, "escrow_half_released", orderId, `Released 50% escrow (${releaseAmount} GHS) to farmer balance on funding.`);
      finalEscrowStatus = 'half_released';
    } else {
      // Just update status to escrow_funded
      await client.query(
        "UPDATE orders SET status = 'escrow_funded', escrow_status = 'funded', updated_at = NOW() WHERE order_id = $1",
        [orderId]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Escrow funded successfully.", order_id: orderId, transaction_id, escrow_status: finalEscrowStatus });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error funding escrow:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

/**
 * B18 fix: POST /api/buyer/orders/:id/release
 * Buyer releases the remaining 50% escrow after confirming delivery quality.
 * Previously this route did not exist, causing a 404 on the "Confirm & Release" button.
 */
exports.releaseEscrow = async (req, res) => {
  const orderId = req.params.id;
  const buyerId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify order ownership and current state
    const check = await client.query(
      `SELECT o.*, l.user_id as farmer_id 
       FROM orders o 
       JOIN listings l ON o.listings_id = l.listing_id 
       WHERE o.order_id = $1`,
      [orderId]
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found." });
    }
    const order = check.rows[0];

    if (order.buyer_id !== buyerId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You do not own this order." });
    }

    if (order.escrow_status !== "half_released") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Cannot release escrow. Current escrow status: '${order.escrow_status}'. Expected 'half_released'.` });
    }

    const orderTotal = parseFloat(order.price) * parseInt(order.quantity);
    const releaseAmount = orderTotal * 0.5;
    const farmerId = order.farmer_id;

    // 1. Credit the remaining 50% escrow to farmer's settled balance
    const farmerWallet = await getOrCreateWallet(client, farmerId);
    const newFarmerEscrow = Math.max(0, parseFloat(farmerWallet.escrow_balance) - releaseAmount);
    const newFarmerBalance = parseFloat(farmerWallet.balance) + releaseAmount;
    await client.query(
      "UPDATE wallets SET balance = $1, escrow_balance = $2, updated_at = NOW() WHERE user_id = $3",
      [newFarmerBalance, newFarmerEscrow, farmerId]
    );

    // 2. Update order to fully released and completed
    await client.query(
      `UPDATE orders 
       SET status = 'delivered', escrow_status = 'released', delivery_status = 'completed', updated_at = NOW() 
       WHERE order_id = $1`,
      [orderId]
    );

    // 3. Create payments record
    await client.query(
      `INSERT INTO payments (order_id, buyer_id, amount, type, status, description) 
       VALUES ($1, $2, $3, 'release', 'confirmed', $4)`,
      [orderId, buyerId, releaseAmount, `Final 50% escrow released by buyer on delivery confirmation.`]
    );

    // 4. Create wallet transaction record for the farmer
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
       VALUES ($1, 'escrow', $2, 'success', $3)`,
      [farmerId, releaseAmount, `Final 50% escrow received on buyer delivery confirmation for order ID ${orderId}.`]
    );

    await logHistory(client, buyerId, "escrow_fully_released", orderId, `Buyer released final 50% escrow (${releaseAmount} GHS) for order ID ${orderId}.`);

    await client.query("COMMIT");
    res.json({ message: "Final 50% escrow released successfully. Order completed.", order_id: orderId, released_amount: releaseAmount });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error releasing escrow:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

exports.getPaymentHistory = async (req, res) => {
  const buyerId = req.user.user_id;


  try {
    const result = await pool.query(
      `SELECT transaction_id as id, type, amount, status, description, created_at
       FROM wallet_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [buyerId]
    );

    // Map 'escrow' type to 'escrow_lock' or 'release' for frontend expectations
    const mapped = result.rows.map(row => {
      let type = row.type;
      if (type === 'escrow') {
        if (row.description.toLowerCase().includes('release')) {
          type = 'release';
        } else {
          type = 'escrow_lock';
        }
      }
      return {
        ...row,
        type
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error("❌ Error fetching payment history:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ==========================================================================
   4. Ratings & Reputation
   ========================================================================== */

exports.rateFarmer = async (req, res) => {
  const rated_user_id = req.body.rated_user_id || req.body.farmer_id || req.body.ratedUserId || req.body.farmerId;
  const { score, comment } = req.body;
  const buyerId = req.user.user_id;

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

    // Check if target rated user exists
    const userCheck = await client.query("SELECT user_id FROM users WHERE user_id = $1", [rated_user_id]);
    
    // If target user doesn't exist by UUID, fallback to first farmer in system
    let targetUserId = rated_user_id;
    if (userCheck.rows.length === 0) {
      const fallbackFarmer = await client.query("SELECT u.user_id FROM users u JOIN roles r ON u.user_id = r.user_id WHERE r.role = 'farmer' LIMIT 1");
      if (fallbackFarmer.rows.length > 0) {
        targetUserId = fallbackFarmer.rows[0].user_id;
      }
    }

    const result = await client.query(
      `INSERT INTO ratings (user_id, rated_user_id, score, comment) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [buyerId, targetUserId, scoreInt, comment || null]
    );
    const rating = result.rows[0];

    await logHistory(client, buyerId, "rating_submitted", rating.rating_id, `Rated user ID ${targetUserId} with score ${scoreInt}`);

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

exports.getBuyerRatings = async (req, res) => {
  const buyerId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT r.rating_id, r.score, r.comment, r.reply, r.created_at, 
              u.username as farmer_name, u.email as farmer_email
       FROM ratings r
       JOIN users u ON r.rated_user_id = u.user_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [buyerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching buyer ratings:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getFarmerProfile = async (req, res) => {
  const farmerId = req.params.id;

  try {
    // Fetch profile
    const profile = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.phone_number, u.region, r.role 
       FROM users u
       JOIN roles r ON u.user_id = r.user_id
       WHERE u.user_id = $1 AND r.role = 'farmer'`,
      [farmerId]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ error: "Farmer not found." });
    }

    // Fetch aggregate rating
    const scoreResult = await pool.query(
      `SELECT AVG(score)::DECIMAL(2,1) as average_rating, 
              COUNT(*) as total_ratings 
       FROM ratings 
       WHERE rated_user_id = $1`,
      [farmerId]
    );

    // Fetch all reviews
    const reviews = await pool.query(
      `SELECT r.rating_id, r.score, r.comment, r.reply, r.created_at, u.username as reviewer_name 
       FROM ratings r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.rated_user_id = $1
       ORDER BY r.created_at DESC`,
      [farmerId]
    );

    res.json({
      profile: profile.rows[0],
      ratings_summary: scoreResult.rows[0],
      reviews: reviews.rows
    });
  } catch (err) {
    console.error("❌ Error fetching farmer profile:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.raiseDispute = async (req, res) => {
  const orderId = req.params.id;
  const { reason } = req.body;
  const buyerId = req.user.user_id;

  if (!reason || reason.trim() === "") {
    return res.status(400).json({ error: "Reason for dispute cannot be empty." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify ownership and status
    const check = await client.query("SELECT * FROM orders WHERE order_id = $1", [orderId]);
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found." });
    }
    if (check.rows[0].buyer_id !== buyerId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You do not own this order." });
    }

    const currentEscrowStatus = check.rows[0].escrow_status;

    // Insert dispute recording previous_escrow_status
    const result = await client.query(
      `INSERT INTO disputes (order_id, buyer_id, reason, previous_escrow_status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [orderId, buyerId, reason, currentEscrowStatus]
    );
    const dispute = result.rows[0];

    // Update order status to disputed, freeze escrow, and backup status
    await client.query(
      "UPDATE orders SET status = 'disputed', escrow_status = 'disputed', previous_escrow_status = $1, updated_at = NOW() WHERE order_id = $2",
      [currentEscrowStatus, orderId]
    );

    // Log history
    await logHistory(client, buyerId, "dispute_raised", dispute.dispute_id, `Raised dispute on order ID ${orderId} due to: ${reason}`);

    await client.query("COMMIT");
    res.status(201).json(dispute);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error raising dispute:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

/* ==========================================================================
   5. Analytics
   ========================================================================== */

exports.getAnalytics = async (req, res) => {
  const buyerId = req.user.user_id;

  try {
    // 1. Total offers placed by buyer
    const offersCount = await pool.query("SELECT COUNT(*) FROM orders WHERE buyer_id = $1", [buyerId]);

    // 2. Average bid acceptance rate (ratio of accepted/ready_for_pickup/delivered orders to total placed)
    const totalOffers = parseInt(offersCount.rows[0].count);
    let acceptanceRate = "0.0%";
    if (totalOffers > 0) {
      const acceptedOffers = await pool.query(
        "SELECT COUNT(*) FROM orders WHERE buyer_id = $1 AND status IN ('accepted', 'escrow_funded', 'ready_for_pickup', 'picked_up', 'delivered', 'disputed')",
        [buyerId]
      );
      acceptanceRate = ((parseInt(acceptedOffers.rows[0].count) / totalOffers) * 100).toFixed(1) + "%";
    }

    // 3. Escrow volume (Total GHS locked in active/completed trades)
    const escrowVolume = await pool.query(
      `SELECT SUM(price * quantity)::DECIMAL(12,2) as total_escrow
       FROM orders
       WHERE buyer_id = $1 AND status IN ('escrow_funded', 'ready_for_pickup', 'picked_up', 'delivered', 'disputed')`,
      [buyerId]
    );

    res.json({
      total_offers: totalOffers,
      bid_acceptance_rate: acceptanceRate,
      total_escrow_funded: parseFloat(escrowVolume.rows[0].total_escrow) || 0.00
    });
  } catch (err) {
    console.error("❌ Error fetching buyer analytics:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

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

exports.selfPickup = async (req, res) => {
  const orderId = req.params.id;
  const buyerId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify order ownership and status, and get farmer info
    const check = await client.query(
      `SELECT o.*, l.user_id as farmer_id 
       FROM orders o 
       JOIN listings l ON o.listings_id = l.listing_id 
       WHERE o.order_id = $1`,
      [orderId]
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found." });
    }
    const order = check.rows[0];

    if (order.buyer_id !== buyerId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You do not own this order." });
    }

    if (order.status !== "ready_for_pickup" && order.status !== "escrow_funded" && order.status !== "accepted") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Cannot confirm self-pickup. Order is in '${order.status}' state.` });
    }

    const orderTotal = parseFloat(order.price) * parseInt(order.quantity);

    // Calculate how much escrow remains to be released
    let releaseAmount = 0.00;
    if (order.escrow_status === 'half_released') {
      releaseAmount = orderTotal * 0.5;
    } else if (order.escrow_status === 'funded') {
      releaseAmount = orderTotal;
    }

    // Update order status, escrow_status, and delivery_status
    await client.query(
      `UPDATE orders 
       SET status = 'delivered', escrow_status = 'released', delivery_status = 'completed', updated_at = NOW() 
       WHERE order_id = $1`,
      [orderId]
    );

    // Release escrow to farmer (if any funds to release)
    if (releaseAmount > 0) {
      const farmerWallet = await getOrCreateWallet(client, order.farmer_id);
      const newFarmerEscrow = Math.max(0, parseFloat(farmerWallet.escrow_balance) - releaseAmount);
      const newFarmerBalance = parseFloat(farmerWallet.balance) + releaseAmount;

      await client.query(
        "UPDATE wallets SET balance = $1, escrow_balance = $2, updated_at = NOW() WHERE user_id = $3",
        [newFarmerBalance, newFarmerEscrow, order.farmer_id]
      );

      // Create release payments record
      await client.query(
        `INSERT INTO payments (order_id, buyer_id, amount, type, status, description) 
         VALUES ($1, $2, $3, 'release', 'confirmed', $4)`,
        [orderId, buyerId, releaseAmount, `Remaining escrow released to farmer via self-pickup.`]
      );

      // Create wallet transaction record for the farmer
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
         VALUES ($1, 'escrow', $2, 'success', $3)`,
        [order.farmer_id, releaseAmount, `Remaining escrow released via self-pickup.`]
      );

      await logHistory(client, order.farmer_id, "escrow_released", orderId, `Released remaining escrow (${releaseAmount} GHS) to farmer for completed self-pickup order ID ${orderId}`);
    }

    // Cancel any associated jobs since transporter was bypassed
    await client.query(
      "UPDATE jobs SET status = 'cancelled', updated_at = NOW() WHERE order_id = $1 AND status != 'delivered'",
      [orderId]
    );

    await client.query("COMMIT");
    res.json({ message: "Self-pickup confirmed successfully. Escrow released to farmer.", order_id: orderId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error in self-pickup:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

exports.resolveDispute = async (req, res) => {
  const orderId = req.params.id;
  const { action } = req.body; // 'cancel' or 'refund'
  const buyerId = req.user.user_id;

  if (!action || (action !== 'cancel' && action !== 'refund')) {
    return res.status(400).json({ error: "A valid dispute resolution action ('cancel' or 'refund') is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch dispute details
    const disputeQuery = await client.query(
      "SELECT * FROM disputes WHERE order_id = $1 AND status = 'open'",
      [orderId]
    );
    if (disputeQuery.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Open dispute for this order not found." });
    }
    const dispute = disputeQuery.rows[0];

    // Fetch order details
    const orderQuery = await client.query(
      `SELECT o.*, l.user_id as farmer_id 
       FROM orders o 
       JOIN listings l ON o.listings_id = l.listing_id 
       WHERE o.order_id = $1`,
      [orderId]
    );
    const order = orderQuery.rows[0];
    const farmerId = order.farmer_id;
    const orderTotal = parseFloat(order.price) * parseInt(order.quantity);

    // Determine the escrow status before dispute
    const prevStatus = dispute.previous_escrow_status || order.previous_escrow_status || 'funded';

    if (action === 'cancel') {
      // 1. Restore previous escrow status and keep order status
      let restoredOrderStatus = 'escrow_funded';
      if (prevStatus === 'half_released') {
        restoredOrderStatus = 'picked_up';
      }
      
      await client.query(
        "UPDATE orders SET status = $1, escrow_status = $2, updated_at = NOW() WHERE order_id = $3",
        [restoredOrderStatus, prevStatus, orderId]
      );

      // 2. Set dispute status to resolved
      await client.query(
        "UPDATE disputes SET status = 'resolved', resolved_at = NOW() WHERE dispute_id = $1",
        [dispute.dispute_id]
      );

      await logHistory(client, buyerId, "dispute_cancelled", dispute.dispute_id, `Cancelled dispute on order ID ${orderId}. Restored escrow status to ${prevStatus}.`);
      
      await client.query("COMMIT");
      return res.json({ message: "Dispute cancelled successfully. Escrow status restored.", order_id: orderId });
    }

    if (action === 'refund') {
      // 1. Calculate refund amount (remaining escrow: 100% if funded, 50% if half_released)
      let refundAmount = 0.00;
      if (prevStatus === 'half_released') {
        refundAmount = orderTotal * 0.5;
      } else {
        refundAmount = orderTotal;
      }

      // 2. Deduct refundAmount from farmer's escrow balance and add it to buyer's wallet balance
      if (refundAmount > 0) {
        // Farmer wallet update
        const farmerWallet = await getOrCreateWallet(client, farmerId);
        const newFarmerEscrow = Math.max(0, parseFloat(farmerWallet.escrow_balance) - refundAmount);
        await client.query(
          "UPDATE wallets SET escrow_balance = $1, updated_at = NOW() WHERE user_id = $2",
          [newFarmerEscrow, farmerId]
        );

        // Buyer wallet update
        const buyerWallet = await getOrCreateWallet(client, buyerId);
        const newBuyerBalance = parseFloat(buyerWallet.balance) + refundAmount;
        await client.query(
          "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2",
          [newBuyerBalance, buyerId]
        );

        // Create release/refund payments record
        await client.query(
          `INSERT INTO payments (order_id, buyer_id, amount, type, status, description) 
           VALUES ($1, $2, $3, 'release', 'confirmed', $4)`,
          [orderId, buyerId, refundAmount, `Escrow refunded to buyer due to dispute resolution.`]
        );

        // Create wallet transaction record for the farmer's escrow deduction
        await client.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
           VALUES ($1, 'escrow', $2, 'success', $3)`,
          [farmerId, -refundAmount, `Escrow refunded to buyer for order ID ${orderId}.`]
        );

        // Create wallet transaction record for the buyer's balance credit
        await client.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
           VALUES ($1, 'deposit', $2, 'success', $3)`,
          [buyerId, refundAmount, `Refund of ${refundAmount} GHS for order ID ${orderId} dispute.`]
        );
      }

      // 3. Set order status to cancelled, escrow_status = refunded, delivery_status = cancelled
      await client.query(
        `UPDATE orders 
         SET status = 'cancelled', escrow_status = 'refunded', delivery_status = 'cancelled', updated_at = NOW() 
         WHERE order_id = $1`,
        [orderId]
      );

      // 4. Update dispute status to resolved
      await client.query(
        "UPDATE disputes SET status = 'resolved', resolved_at = NOW() WHERE dispute_id = $1",
        [dispute.dispute_id]
      );

      // Cancel associated jobs
      await client.query(
        "UPDATE jobs SET status = 'cancelled', updated_at = NOW() WHERE order_id = $1 AND status != 'delivered'",
        [orderId]
      );

      // Restore listing inventory on dispute refund/cancellation
      const listingCheck = await client.query("SELECT * FROM listings WHERE listing_id = $1 FOR UPDATE", [order.listings_id]);
      if (listingCheck.rows.length > 0) {
        const currentQty = parseInt(listingCheck.rows[0].quantity) || 0;
        const restoredQty = currentQty + (parseInt(order.quantity) || 0);
        await client.query(
          "UPDATE listings SET quantity = $1, status = 'open' WHERE listing_id = $2",
          [restoredQty, order.listings_id]
        );
      }

      await logHistory(client, buyerId, "dispute_refunded", dispute.dispute_id, `Resolved dispute on order ID ${orderId} with a refund of ${refundAmount} GHS to buyer.`);

      await client.query("COMMIT");
      return res.json({ message: "Dispute resolved with a refund. Escrow returned to buyer.", order_id: orderId, refund_amount: refundAmount });
    }

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error in dispute resolution:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

exports.getOrderLocation = async (req, res) => {
  const orderId = req.params.id;
  const buyerId = req.user.user_id;

  try {
    // Verify that the order belongs to this buyer
    const orderCheck = await pool.query(
      `SELECT transporter_latitude, transporter_longitude, location_updated_at, delivery_status 
       FROM orders 
       WHERE order_id = $1 AND buyer_id = $2`,
      [orderId, buyerId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Order not found or unauthorized." });
    }

    const order = orderCheck.rows[0];
    res.json({
      latitude: order.transporter_latitude ? parseFloat(order.transporter_latitude) : null,
      longitude: order.transporter_longitude ? parseFloat(order.transporter_longitude) : null,
      updated_at: order.location_updated_at,
      delivery_status: order.delivery_status
    });
  } catch (err) {
    console.error("❌ Error fetching order location for buyer:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getDashboardSummary = async (req, res) => {
  const buyerId = req.user.user_id;

  const client = await pool.connect();
  try {
    // 1. Get active offers count (orders placed by buyer that are pending)
    const activeOffersResult = await client.query(
      "SELECT COUNT(*) FROM orders WHERE buyer_id = $1 AND status = 'pending'",
      [buyerId]
    );

    // 2. Get escrow balance from wallet
    const wallet = await getOrCreateWallet(client, buyerId);

    // 3. Calculate acceptance rate
    const offersCountResult = await client.query(
      "SELECT COUNT(*) FROM orders WHERE buyer_id = $1",
      [buyerId]
    );
    const totalOffers = parseInt(offersCountResult.rows[0].count) || 0;
    let acceptanceRate = "100%"; // default to 100% if no offers placed
    if (totalOffers > 0) {
      const acceptedOffersResult = await client.query(
        "SELECT COUNT(*) FROM orders WHERE buyer_id = $1 AND status IN ('accepted', 'escrow_funded', 'ready_for_pickup', 'picked_up', 'delivered', 'disputed')",
        [buyerId]
      );
      acceptanceRate = Math.round((parseInt(acceptedOffersResult.rows[0].count) / totalOffers) * 100) + "%";
    }

    res.json({
      activeOffersCount: parseInt(activeOffersResult.rows[0].count) || 0,
      settledBalance: parseFloat(wallet.balance) || 0.00,
      escrowBalance: parseFloat(wallet.escrow_balance) || 0.00,
      acceptanceRate: acceptanceRate
    });
  } catch (err) {
    console.error("❌ Error fetching buyer dashboard summary:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

exports.depositFunds = async (req, res) => {
  const userId = req.user.user_id;
  const { amount, momo_number, provider } = req.body;

  const depositAmount = parseFloat(amount);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    return res.status(400).json({ error: "Invalid deposit amount." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Update wallet balance
    const wallet = await getOrCreateWallet(client, userId);
    const newBalance = parseFloat(wallet.balance) + depositAmount;
    await client.query(
      "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2",
      [newBalance, userId]
    );

    // 2. Create wallet transaction record
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
       VALUES ($1, 'deposit', $2, 'success', $3)`,
      [userId, depositAmount, `Deposit via ${provider || 'MoMo'} (${momo_number || 'N/A'})`]
    );

    // 3. Log history
    await logHistory(client, userId, "wallet_deposit", wallet.wallet_id, `Deposited ${depositAmount} GHS via MoMo`);

    await client.query("COMMIT");
    res.json({
      message: "Deposit successful.",
      balance: {
        settled: newBalance,
        escrow: parseFloat(wallet.escrow_balance) || 0.00
      }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error depositing funds:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

exports.getBuyerDisputes = async (req, res) => {
  const buyerId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT d.dispute_id, d.order_id, d.reason, d.status, d.created_at,
              l.crop_name, u.username as farmer_name
       FROM disputes d
       JOIN orders o ON d.order_id = o.order_id
       JOIN listings l ON o.listings_id = l.listing_id
       JOIN users u ON l.user_id = u.user_id
       WHERE d.buyer_id = $1
       ORDER BY d.created_at DESC`,
      [buyerId]
    );

    const mapped = result.rows.map(row => {
      let category = "General";
      let details = row.reason || "";
      
      if (row.reason && row.reason.startsWith("[")) {
        const match = row.reason.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
          category = match[1];
          details = match[2];
        }
      }
      
      return {
        id: row.dispute_id,
        disputeId: row.dispute_id,
        orderId: row.order_id,
        category,
        details,
        status: row.status,
        createdAt: row.created_at,
        farmerName: row.farmer_name,
        cropName: row.crop_name
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error("❌ Error fetching disputes:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.resolveDisputeById = async (req, res) => {
  const disputeId = req.params.id;
  const { action } = req.body;
  const buyerId = req.user.user_id;

  if (!action || (action !== 'cancel' && action !== 'refund')) {
    return res.status(400).json({ error: "A valid dispute resolution action ('cancel' or 'refund') is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch dispute details by dispute_id
    const disputeQuery = await client.query(
      "SELECT * FROM disputes WHERE dispute_id = $1 AND status = 'open'",
      [disputeId]
    );
    if (disputeQuery.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Open dispute not found." });
    }
    const dispute = disputeQuery.rows[0];
    const orderId = dispute.order_id;

    // Fetch order details
    const orderQuery = await client.query(
      `SELECT o.*, l.user_id as farmer_id 
       FROM orders o 
       JOIN listings l ON o.listings_id = l.listing_id 
       WHERE o.order_id = $1`,
      [orderId]
    );
    const order = orderQuery.rows[0];
    const farmerId = order.farmer_id;
    const orderTotal = parseFloat(order.price) * parseInt(order.quantity);

    // Determine the escrow status before dispute
    const prevStatus = dispute.previous_escrow_status || order.previous_escrow_status || 'funded';

    if (action === 'cancel') {
      // 1. Restore previous escrow status and keep order status
      let restoredOrderStatus = 'escrow_funded';
      if (prevStatus === 'half_released') {
        restoredOrderStatus = 'picked_up';
      }
      
      await client.query(
        "UPDATE orders SET status = $1, escrow_status = $2, updated_at = NOW() WHERE order_id = $3",
        [restoredOrderStatus, prevStatus, orderId]
      );

      // 2. Set dispute status to resolved
      await client.query(
        "UPDATE disputes SET status = 'resolved', resolved_at = NOW() WHERE dispute_id = $1",
        [disputeId]
      );

      await logHistory(client, buyerId, "dispute_cancelled", disputeId, `Cancelled dispute on order ID ${orderId}. Restored escrow status to ${prevStatus}.`);
      
      await client.query("COMMIT");
      return res.json({ message: "Dispute cancelled successfully. Escrow status restored.", order_id: orderId });
    }

    if (action === 'refund') {
      // 1. Calculate refund amount (remaining escrow: 100% if funded, 50% if half_released)
      let refundAmount = 0.00;
      if (prevStatus === 'half_released') {
        refundAmount = orderTotal * 0.5;
      } else {
        refundAmount = orderTotal;
      }

      // 2. Deduct refundAmount from farmer's escrow balance and add it to buyer's wallet balance
      if (refundAmount > 0) {
        // Farmer wallet update
        const farmerWallet = await getOrCreateWallet(client, farmerId);
        const newFarmerEscrow = Math.max(0, parseFloat(farmerWallet.escrow_balance) - refundAmount);
        await client.query(
          "UPDATE wallets SET escrow_balance = $1, updated_at = NOW() WHERE user_id = $2",
          [newFarmerEscrow, farmerId]
        );

        // Buyer wallet update
        const buyerWallet = await getOrCreateWallet(client, buyerId);
        const newBuyerBalance = parseFloat(buyerWallet.balance) + refundAmount;
        await client.query(
          "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2",
          [newBuyerBalance, buyerId]
        );

        // Create refund payments record
        await client.query(
          `INSERT INTO payments (order_id, buyer_id, amount, type, status, description) 
           VALUES ($1, $2, $3, 'release', 'confirmed', $4)`,
          [orderId, buyerId, refundAmount, `Refund of ${refundAmount} GHS paid to buyer on dispute resolution.`]
        );

        // Create wallet transaction record for the buyer's refund
        await client.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
           VALUES ($1, 'deposit', $2, 'success', $3)`,
          [buyerId, refundAmount, `Escrow refund received for order ID ${orderId} dispute.`]
        );
      }

      // 3. Update order status to cancelled, escrow_status to refunded, and delivery_status to cancelled
      await client.query(
        `UPDATE orders 
         SET status = 'cancelled', escrow_status = 'refunded', delivery_status = 'cancelled', updated_at = NOW() 
         WHERE order_id = $1`,
        [orderId]
      );

      // 4. Set dispute status to resolved/refunded
      await client.query(
        "UPDATE disputes SET status = 'refunded', resolved_at = NOW() WHERE dispute_id = $1",
        [disputeId]
      );

      // Cancel associated jobs
      await client.query(
        "UPDATE jobs SET status = 'cancelled', updated_at = NOW() WHERE order_id = $1 AND status != 'delivered'",
        [orderId]
      );

      await logHistory(client, buyerId, "dispute_refunded", disputeId, `Resolved dispute on order ID ${orderId} with a refund of ${refundAmount} GHS to buyer.`);

      await client.query("COMMIT");
      return res.json({ message: "Dispute resolved with a refund. Escrow returned to buyer.", order_id: orderId, refund_amount: refundAmount });
    }

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error in dispute resolution by ID:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};



