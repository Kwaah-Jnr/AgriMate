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

/* ==========================================================================
   1. Listings Management
   ========================================================================== */

exports.createListing = async (req, res) => {
  const { crop_name, quantity, price, grade, location, image_url } = req.body;
  const userId = req.user.user_id;

  if (!crop_name || !quantity || !price) {
    return res.status(400).json({ error: "Crop name, quantity, and price per bag are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO listings (user_id, crop_name, quantity, price, grade, location, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [userId, crop_name, quantity, price, grade || null, location || null, image_url || null]
    );
    const listing = result.rows[0];

    await logHistory(client, userId, "listing_created", listing.listing_id, `Created listing for ${quantity} bags of ${crop_name}`);
    await client.query("COMMIT");

    res.status(201).json(listing);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error creating listing:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

exports.updateListing = async (req, res) => {
  const listingId = req.params.id;
  const { crop_name, quantity, price, grade, location, image_url, status } = req.body;
  const userId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify ownership
    const check = await client.query("SELECT * FROM listings WHERE listing_id = $1", [listingId]);
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Listing not found." });
    }
    if (check.rows[0].user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You do not own this listing." });
    }

    const current = check.rows[0];
    const newCrop = crop_name !== undefined ? crop_name : current.crop_name;
    const newQty = quantity !== undefined ? quantity : current.quantity;
    const newPrice = price !== undefined ? price : current.price;
    const newGrade = grade !== undefined ? grade : current.grade;
    const newLoc = location !== undefined ? location : current.location;
    const newImg = image_url !== undefined ? image_url : current.image_url;
    const newStatus = status !== undefined ? status : current.status;

    const result = await client.query(
      `UPDATE listings 
       SET crop_name = $1, quantity = $2, price = $3, grade = $4, location = $5, image_url = $6, status = $7 
       WHERE listing_id = $8 
       RETURNING *`,
      [newCrop, newQty, newPrice, newGrade, newLoc, newImg, newStatus, listingId]
    );

    await logHistory(client, userId, "listing_updated", listingId, `Updated listing ID ${listingId} parameters`);
    await client.query("COMMIT");

    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating listing:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

exports.deleteListing = async (req, res) => {
  const listingId = req.params.id;
  const userId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify ownership
    const check = await client.query("SELECT * FROM listings WHERE listing_id = $1", [listingId]);
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Listing not found." });
    }
    if (check.rows[0].user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You do not own this listing." });
    }

    await client.query("DELETE FROM listings WHERE listing_id = $1", [listingId]);
    await logHistory(client, userId, "listing_deleted", listingId, `Deleted listing ID ${listingId}`);
    await client.query("COMMIT");

    res.json({ message: "Listing deleted successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error deleting listing:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

exports.getOwnListings = async (req, res) => {
  const userId = req.user.user_id;
  const { status, limit = 10, offset = 0 } = req.query;

  try {
    let query = "SELECT * FROM listings WHERE user_id = $1";
    const params = [userId];

    if (status) {
      query += " AND status = $2";
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching own listings:", err.message);
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
   2. Order / Offer Interaction
   ========================================================================== */

exports.getOffers = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT o.order_id, o.price, o.price as offered_price, o.quantity, o.quantity as offered_quantity, 
              o.status, o.status as offer_status, o.pickup_by, o.note, o.created_at, o.escrow_status, o.transporter_vehicle,
              l.listing_id, l.crop_name, l.grade, l.location as listing_location,
              u.username as buyer_name, u.phone_number as buyer_phone
       FROM orders o
       JOIN listings l ON o.listings_id = l.listing_id
       JOIN users u ON o.buyer_id = u.user_id
       WHERE l.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching offers:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.acceptOffer = async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify ownership of the listing linked to the offer
    const verifyResult = await client.query(
      `SELECT o.*, l.user_id as farmer_id 
       FROM orders o 
       JOIN listings l ON o.listings_id = l.listing_id 
       WHERE o.order_id = $1`,
      [orderId]
    );

    if (verifyResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Offer not found." });
    }
    const offer = verifyResult.rows[0];

    if (offer.farmer_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You do not own the listing associated with this offer." });
    }

    if (offer.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Offer is already in '${offer.status}' state.` });
    }

    // 1. Accept order and set initial escrow and delivery status
    await client.query(
      "UPDATE orders SET status = 'accepted', escrow_status = 'unfunded', delivery_status = 'pending', updated_at = NOW() WHERE order_id = $1",
      [orderId]
    );

    // 2. Mark listing as accepted
    await client.query("UPDATE listings SET status = 'accepted' WHERE listing_id = $1", [offer.listings_id]);

    // 3. Update wallet escrow
    const orderTotal = parseFloat(offer.price) * parseInt(offer.quantity);
    const wallet = await getOrCreateWallet(client, userId);
    const newEscrow = parseFloat(wallet.escrow_balance) + orderTotal;
    await client.query("UPDATE wallets SET escrow_balance = $1, updated_at = NOW() WHERE user_id = $2", [newEscrow, userId]);

    // 4. Create record in payments table matching the new schema
    await client.query(
      `INSERT INTO payments (order_id, buyer_id, amount, type, status, description) 
       VALUES ($1, $2, $3, 'escrow_lock', 'pending', $4)`,
      [orderId, offer.buyer_id, orderTotal, `Escrow of ${orderTotal} GHS accepted, pending funding.`]
    );

    // 5. Log history
    await logHistory(client, userId, "offer_accepted", orderId, `Accepted offer of ${offer.price} GHS/bag for order ID ${orderId}`);
    
    await client.query("COMMIT");

    const updatedOffer = await client.query(
      `SELECT o.order_id, o.price, o.price as offered_price, o.quantity, o.quantity as offered_quantity, 
              o.status, o.status as offer_status, o.pickup_by, o.note, o.created_at,
              l.listing_id, l.crop_name, l.grade, l.location as listing_location,
              u.username as buyer_name, u.phone_number as buyer_phone
       FROM orders o
       JOIN listings l ON o.listings_id = l.listing_id
       JOIN users u ON o.buyer_id = u.user_id
       WHERE o.order_id = $1`,
      [orderId]
    );

    res.json(updatedOffer.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error accepting offer:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

exports.rejectOffer = async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify ownership
    const verifyResult = await client.query(
      `SELECT o.*, l.user_id as farmer_id 
       FROM orders o 
       JOIN listings l ON o.listings_id = l.listing_id 
       WHERE o.order_id = $1`,
      [orderId]
    );

    if (verifyResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Offer not found." });
    }
    const offer = verifyResult.rows[0];

    if (offer.farmer_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You do not own the listing associated with this offer." });
    }

    if (offer.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Offer is already in '${offer.status}' state.` });
    }

    await client.query("UPDATE orders SET status = 'rejected', updated_at = NOW() WHERE order_id = $1", [orderId]);
    await logHistory(client, userId, "offer_rejected", orderId, `Rejected offer for order ID ${orderId}`);

    await client.query("COMMIT");

    const updatedOffer = await client.query(
      `SELECT o.order_id, o.price, o.price as offered_price, o.quantity, o.quantity as offered_quantity, 
              o.status, o.status as offer_status, o.pickup_by, o.note, o.created_at,
              l.listing_id, l.crop_name, l.grade, l.location as listing_location,
              u.username as buyer_name, u.phone_number as buyer_phone
       FROM orders o
       JOIN listings l ON o.listings_id = l.listing_id
       JOIN users u ON o.buyer_id = u.user_id
       WHERE o.order_id = $1`,
      [orderId]
    );

    res.json(updatedOffer.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error rejecting offer:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

exports.fulfillOrder = async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify ownership and accepted status
    const verifyResult = await client.query(
      `SELECT o.*, l.user_id as farmer_id 
       FROM orders o 
       JOIN listings l ON o.listings_id = l.listing_id 
       WHERE o.order_id = $1`,
      [orderId]
    );

    if (verifyResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found." });
    }
    const order = verifyResult.rows[0];

    if (order.farmer_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden. You do not own the listing associated with this order." });
    }

    if (order.status !== "accepted" && order.status !== "escrow_funded" && order.status !== "ready_for_pickup") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Order must be in 'accepted' or 'escrow_funded' status to mark ready. Current status: '${order.status}'` });
    }

    let escrowReleased = false;
    const orderTotal = parseFloat(order.price) * parseInt(order.quantity);
    const releaseAmount = orderTotal * 0.5;

    if (order.escrow_status === 'funded') {
      // 1. Release 50% escrow to farmer settled balance
      const farmerWallet = await getOrCreateWallet(client, userId);
      const newFarmerEscrow = Math.max(0, parseFloat(farmerWallet.escrow_balance) - releaseAmount);
      const newFarmerBalance = parseFloat(farmerWallet.balance) + releaseAmount;
      await client.query(
        "UPDATE wallets SET balance = $1, escrow_balance = $2, updated_at = NOW() WHERE user_id = $3",
        [newFarmerBalance, newFarmerEscrow, userId]
      );

      // 2. Update order status to ready_for_pickup and escrow_status to half_released
      await client.query(
        "UPDATE orders SET status = 'ready_for_pickup', escrow_status = 'half_released', delivery_status = 'pending', updated_at = NOW() WHERE order_id = $1",
        [orderId]
      );

      // 3. Create payments record for the 50% release
      await client.query(
        `INSERT INTO payments (order_id, buyer_id, amount, type, status, description) 
         VALUES ($1, $2, $3, 'release', 'confirmed', $4)`,
        [orderId, order.buyer_id, releaseAmount, `50% escrow released to farmer on order fulfillment.`]
      );

      // 4. Create wallet transaction record
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
         VALUES ($1, 'escrow', $2, 'success', $3)`,
        [userId, releaseAmount, `50% escrow released on order fulfillment.`]
      );

      await logHistory(client, userId, "escrow_half_released", orderId, `Released 50% escrow (${releaseAmount} GHS) on fulfillment.`);
      escrowReleased = true;
    } else {
      // Just update status to ready_for_pickup
      await client.query(
        "UPDATE orders SET status = 'ready_for_pickup', delivery_status = 'pending', updated_at = NOW() WHERE order_id = $1",
        [orderId]
      );
    }
    
    // Create matching available job for transporters
    const distanceKm = Math.floor(Math.random() * 100) + 20; // 20 to 120 km
    const payout = (distanceKm * 2 + 50).toFixed(2); // 2 GHS per km + 50 GHS base
    const qrPickup = `QR-PICKUP-${orderId}-${Math.floor(Math.random() * 900) + 100}`;
    const qrDelivery = `QR-DELIVERY-${orderId}-${Math.floor(Math.random() * 900) + 100}`;

    await client.query(
      `INSERT INTO jobs (order_id, distance_km, payout, status, qr_pickup, qr_delivery, flat_fee) 
       VALUES ($1, $2, $3, 'available', $4, $5, 100.00)`,
      [orderId, distanceKm, payout, qrPickup, qrDelivery]
    );

    await logHistory(client, userId, "order_ready_for_pickup", orderId, `Marked order ID ${orderId} as ready for pickup. Created logistics job.`);

    await client.query("COMMIT");
    res.json({ 
      message: "Order marked ready for pickup successfully. Logistics job is now available.", 
      escrow_status: escrowReleased ? 'half_released' : order.escrow_status 
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error fulfilling order:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

/* ==========================================================================
   3. Wallet & Payments
   ========================================================================== */

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

    // Insert wallet transaction record
    const txResult = await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
       VALUES ($1, 'withdrawal', $2, 'success', $3) RETURNING *`,
      [userId, amount, `Withdrew ${amount} GHS to Mobile Money (${phone})`]
    );
    
    // Log history
    await logHistory(client, userId, "withdraw_momo", wallet.wallet_id, `Withdrew ${amount} GHS to MTN MoMo wallet (${phone})`);

    await client.query("COMMIT");
    res.json({
      message: "Withdrawal successful.",
      balance: {
        settled: newBalance,
        escrow: parseFloat(wallet.escrow_balance) || 0.00
      },
      transaction: txResult.rows[0]
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error withdrawing funds:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

exports.getHistory = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      "SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching transaction history:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ==========================================================================
   4. Ratings & Reputation
   ========================================================================== */

exports.getRatings = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT r.rating_id, r.score, r.comment, r.reply, r.created_at,
              u.username as reviewer_name, u.email as reviewer_email
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

exports.replyToRating = async (req, res) => {
  const ratingId = req.params.id;
  const userId = req.user.user_id;
  const { reply } = req.body;

  if (!reply || reply.trim() === "") {
    return res.status(400).json({ error: "Reply comment cannot be empty." });
  }

  try {
    const check = await pool.query("SELECT * FROM ratings WHERE rating_id = $1", [ratingId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Rating not found." });
    }
    if (check.rows[0].rated_user_id !== userId) {
      return res.status(403).json({ error: "Forbidden. You cannot reply to feedback left for someone else." });
    }

    const result = await pool.query(
      "UPDATE ratings SET reply = $1 WHERE rating_id = $2 RETURNING *",
      [reply, ratingId]
    );

    res.json({ message: "Reply posted successfully.", rating: result.rows[0] });
  } catch (err) {
    console.error("❌ Error replying to rating:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAverageScore = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT AVG(score)::DECIMAL(2,1) as average_rating, 
              COUNT(*) as total_ratings 
       FROM ratings 
       WHERE rated_user_id = $1`,
      [userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error getting average rating score:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ==========================================================================
   5. Analytics
   ========================================================================== */

exports.getAnalytics = async (req, res) => {
  const userId = req.user.user_id;

  try {
    // 1. Total listings created by farmer
    const listingsCount = await pool.query("SELECT COUNT(*) FROM listings WHERE user_id = $1", [userId]);

    // 2. Sum of all completed / accepted orders for revenue
    const revenueSum = await pool.query(
      `SELECT SUM(o.price * o.quantity)::DECIMAL(12,2) as total_revenue
       FROM orders o
       JOIN listings l ON o.listings_id = l.listing_id
       WHERE l.user_id = $1 AND o.status IN ('accepted', 'ready_for_pickup', 'picked_up', 'delivered')`,
      [userId]
    );

    // 3. Average completion time (Order created -> Order delivered)
    // To calculate this: we check history log intervals or orders table updates
    // Let's use orders created_at and updated_at (where status = 'delivered')
    const deliveryTimes = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 3600)::DECIMAL(10,2) as avg_hours_to_delivery
       FROM orders o
       JOIN listings l ON o.listings_id = l.listing_id
       WHERE l.user_id = $1 AND o.status = 'delivered'`,
      [userId]
    );

    res.json({
      total_listings: parseInt(listingsCount.rows[0].count),
      total_revenue: parseFloat(revenueSum.rows[0].total_revenue) || 0.00,
      average_hours_to_delivery: deliveryTimes.rows[0].avg_hours_to_delivery 
        ? parseFloat(deliveryTimes.rows[0].avg_hours_to_delivery) 
        : "N/A"
    });
  } catch (err) {
    console.error("❌ Error fetching farmer analytics:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getOrderLocation = async (req, res) => {
  const orderId = req.params.id;
  const farmerId = req.user.user_id;

  try {
    // Verify that the order's listing belongs to this farmer
    const orderCheck = await pool.query(
      `SELECT o.transporter_latitude, o.transporter_longitude, o.location_updated_at, o.delivery_status 
       FROM orders o
       JOIN listings l ON o.listings_id = l.listing_id
       WHERE o.order_id = $1 AND l.user_id = $2`,
      [orderId, farmerId]
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
    console.error("❌ Error fetching order location for farmer:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getDashboardSummary = async (req, res) => {
  const userId = req.user.user_id;

  const client = await pool.connect();
  try {
    // 1. Get active listings count
    const listingsCountResult = await client.query(
      "SELECT COUNT(*) FROM listings WHERE user_id = $1 AND status = 'open'",
      [userId]
    );

    // 2. Get pending offers count
    const offersCountResult = await client.query(
      `SELECT COUNT(o.order_id) 
       FROM orders o 
       JOIN listings l ON o.listings_id = l.listing_id 
       WHERE l.user_id = $1 AND o.status = 'pending'`,
      [userId]
    );

    // 3. Get settled and escrow balance from wallet
    const wallet = await getOrCreateWallet(client, userId);

    // 4. Get rating score
    const ratingsResult = await client.query(
      "SELECT AVG(score)::DECIMAL(2,1) as average_rating FROM ratings WHERE rated_user_id = $1",
      [userId]
    );

    res.json({
      activeListingsCount: parseInt(listingsCountResult.rows[0].count) || 0,
      pendingOffersCount: parseInt(offersCountResult.rows[0].count) || 0,
      settledBalance: parseFloat(wallet.balance) || 0.00,
      escrowBalance: parseFloat(wallet.escrow_balance) || 0.00,
      ratingScore: parseFloat(ratingsResult.rows[0].average_rating) || 5.0
    });
  } catch (err) {
    console.error("❌ Error fetching farmer dashboard summary:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

