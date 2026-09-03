const pool = require("../database");

/* ==========================================================================
   1. Admin Platform Overview & Summary KPIs
   ========================================================================== */
exports.getSummary = async (req, res) => {
  try {
    // 1. User metrics
    const totalUsersRes = await pool.query("SELECT COUNT(*) as total FROM users");
    const totalUsers = parseInt(totalUsersRes.rows[0].total) || 0;

    const userCounts = await pool.query(
      `SELECT LOWER(r.role::text) as role, COUNT(*) as count 
       FROM roles r 
       GROUP BY LOWER(r.role::text)`
    );
    let totalFarmers = 0;
    let totalBuyers = 0;
    let totalTransporters = 0;

    userCounts.rows.forEach(row => {
      const cnt = parseInt(row.count) || 0;
      if (row.role === 'farmer') totalFarmers = cnt;
      if (row.role === 'buyer') totalBuyers = cnt;
      if (row.role === 'transporter') totalTransporters = cnt;
    });

    // 2. Listing & Order Metrics
    const listingsRes = await pool.query(
      "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'open') as open_cnt FROM listings"
    );
    const totalListings = parseInt(listingsRes.rows[0].total) || 0;
    const activeListings = parseInt(listingsRes.rows[0].open_cnt) || 0;

    const ordersRes = await pool.query(
      "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'delivered') as completed_cnt FROM orders"
    );
    const totalOrders = parseInt(ordersRes.rows[0].total) || 0;
    const completedOrders = parseInt(ordersRes.rows[0].completed_cnt) || 0;

    // 3. Open Disputes & Active Logistics Deliveries
    const disputesRes = await pool.query(
      "SELECT COUNT(*) as open_cnt FROM disputes WHERE status IN ('pending', 'disputed', 'under_review')"
    );
    const openDisputes = parseInt(disputesRes.rows[0].open_cnt) || 0;

    const activeDeliveriesRes = await pool.query(
      "SELECT COUNT(*) as active_cnt FROM jobs WHERE status IN ('assigned', 'picked_up')"
    );
    const activeDeliveries = parseInt(activeDeliveriesRes.rows[0].active_cnt) || 0;

    // 4. Financial Ledger Totals (Settled Balance & Escrow)
    const walletSumsRes = await pool.query(
      `SELECT COALESCE(SUM(balance), 0)::DECIMAL(14,2) as total_settled, 
              COALESCE(SUM(escrow_balance), 0)::DECIMAL(14,2) as total_escrow 
       FROM wallets`
    );
    const totalSettledBalance = parseFloat(walletSumsRes.rows[0].total_settled) || 0.00;
    const totalEscrowBalance = parseFloat(walletSumsRes.rows[0].total_escrow) || 0.00;

    // Gross Trade Volume
    const tradeVolumeRes = await pool.query(
      `SELECT COALESCE(SUM(price * quantity), 0)::DECIMAL(14,2) as total_volume 
       FROM orders 
       WHERE status = 'delivered' OR escrow_status IN ('half_released', 'released')`
    );
    const totalTradeVolume = parseFloat(tradeVolumeRes.rows[0].total_volume) || 0.00;

    // 5. Recent System Activity Stream
    const activityRes = await pool.query(
      `SELECT h.history_id as log_id, h.user_id, h.action_type as action, h.reference_id as target_id, h.description, h.created_at,
              u.username, u.email, r.role::text as role
       FROM history h
       LEFT JOIN users u ON h.user_id = u.user_id
       LEFT JOIN roles r ON u.user_id = r.user_id
       ORDER BY h.created_at DESC
       LIMIT 15`
    );

    res.json({
      totalUsers,
      totalFarmers,
      totalBuyers,
      totalTransporters,
      totalListings,
      activeListings,
      totalOrders,
      completedOrders,
      openDisputes,
      activeDeliveries,
      totalSettledBalance,
      totalEscrowBalance,
      totalTradeVolume,
      recentActivity: activityRes.rows.map(row => ({
        id: row.log_id,
        userId: row.user_id,
        username: row.username || 'System',
        email: row.email || 'N/A',
        role: row.role || 'user',
        action: row.action,
        targetId: row.target_id,
        description: row.description,
        createdAt: row.created_at
      }))
    });
  } catch (err) {
    console.error("❌ Error fetching admin summary:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};

/* ==========================================================================
   2. Admin Dispute Adjudication Center
   ========================================================================== */
exports.getDisputes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.dispute_id, d.order_id, d.reason, d.status as dispute_status, d.created_at as dispute_created_at,
              o.price, o.quantity, (o.price * o.quantity) as total_amount, o.status as order_status, o.escrow_status,
              l.crop_name, l.grade, l.location as listing_location,
              buyer.user_id as buyer_id, buyer.username as buyer_name, buyer.phone_number as buyer_phone, buyer.email as buyer_email,
              farmer.user_id as farmer_id, farmer.username as farmer_name, farmer.phone_number as farmer_phone, farmer.email as farmer_email,
              transporter.username as transporter_name, transporter.phone_number as transporter_phone
       FROM disputes d
       JOIN orders o ON d.order_id = o.order_id
       JOIN listings l ON o.listings_id = l.listing_id
       JOIN users buyer ON o.buyer_id = buyer.user_id
       JOIN users farmer ON l.user_id = farmer.user_id
       LEFT JOIN jobs j ON o.order_id = j.order_id
       LEFT JOIN users transporter ON j.transporter_id = transporter.user_id
       ORDER BY d.created_at DESC`
    );

    const disputes = result.rows.map(row => ({
      disputeId: row.dispute_id,
      orderId: row.order_id,
      reason: row.reason,
      status: row.dispute_status,
      createdAt: row.dispute_created_at,
      cropName: row.crop_name,
      grade: row.grade,
      location: row.listing_location,
      price: parseFloat(row.price),
      quantity: parseFloat(row.quantity),
      totalAmount: parseFloat(row.total_amount),
      orderStatus: row.order_status,
      escrowStatus: row.escrow_status,
      buyer: {
        id: row.buyer_id,
        name: row.buyer_name,
        phone: row.buyer_phone,
        email: row.buyer_email
      },
      farmer: {
        id: row.farmer_id,
        name: row.farmer_name,
        phone: row.farmer_phone,
        email: row.farmer_email
      },
      transporter: row.transporter_name ? {
        name: row.transporter_name,
        phone: row.transporter_phone
      } : null
    }));

    res.json(disputes);
  } catch (err) {
    console.error("❌ Error fetching admin disputes:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};

exports.resolveDispute = async (req, res) => {
  const disputeId = req.params.id;
  const adminId = req.user.user_id;
  const { action, notes, farmer_share_pct } = req.body; // action: 'refund', 'release', 'split', 'dismiss'

  if (!action || !['refund', 'release', 'split', 'dismiss'].includes(action)) {
    return res.status(400).json({ error: "Invalid action. Must be 'refund', 'release', 'split', or 'dismiss'." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch dispute and associated order
    const disputeRes = await client.query(
      `SELECT d.*, o.order_id, o.buyer_id, o.price, o.quantity, o.escrow_status, l.user_id as farmer_id, l.crop_name
       FROM disputes d
       JOIN orders o ON d.order_id = o.order_id
       JOIN listings l ON o.listings_id = l.listing_id
       WHERE d.dispute_id = $1`,
      [disputeId]
    );

    if (disputeRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Dispute record not found." });
    }

    const dispute = disputeRes.rows[0];
    const orderId = dispute.order_id;
    const buyerId = dispute.buyer_id;
    const farmerId = dispute.farmer_id;
    const totalOrderAmount = parseFloat(dispute.price) * parseFloat(dispute.quantity);

    // Fetch buyer & farmer wallets
    const buyerWalletRes = await client.query("SELECT * FROM wallets WHERE user_id = $1", [buyerId]);
    const farmerWalletRes = await client.query("SELECT * FROM wallets WHERE user_id = $1", [farmerId]);
    const buyerWallet = buyerWalletRes.rows[0];
    const farmerWallet = farmerWalletRes.rows[0];

    let resolutionSummary = "";

    if (action === 'refund') {
      // Refund 100% back to buyer settled balance
      const buyerEscrow = parseFloat(buyerWallet.escrow_balance) || 0.00;
      const refundAmount = Math.min(buyerEscrow, totalOrderAmount);

      const newBuyerEscrow = Math.max(0, buyerEscrow - refundAmount);
      const newBuyerBalance = (parseFloat(buyerWallet.balance) || 0.00) + refundAmount;

      await client.query(
        "UPDATE wallets SET balance = $1, escrow_balance = $2, updated_at = NOW() WHERE user_id = $3",
        [newBuyerBalance, newBuyerEscrow, buyerId]
      );

      await client.query(
        "UPDATE orders SET status = 'cancelled', escrow_status = 'refunded', delivery_status = 'cancelled', updated_at = NOW() WHERE order_id = $1",
        [orderId]
      );

      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
         VALUES ($1, 'refund', $2, 'success', $3)`,
        [buyerId, refundAmount, `Admin dispute resolution: Full refund for order ID ${orderId}`]
      );

      resolutionSummary = `Admin refunded GH₵ ${refundAmount.toFixed(2)} to buyer.`;

    } else if (action === 'release') {
      // Release 100% to farmer settled balance
      const buyerEscrow = parseFloat(buyerWallet.escrow_balance) || 0.00;
      const releaseAmount = Math.min(buyerEscrow, totalOrderAmount);

      const newBuyerEscrow = Math.max(0, buyerEscrow - releaseAmount);
      const newFarmerBalance = (parseFloat(farmerWallet.balance) || 0.00) + releaseAmount;

      await client.query(
        "UPDATE wallets SET escrow_balance = $1, updated_at = NOW() WHERE user_id = $2",
        [newBuyerEscrow, buyerId]
      );
      await client.query(
        "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2",
        [newFarmerBalance, farmerId]
      );

      await client.query(
        "UPDATE orders SET status = 'delivered', escrow_status = 'released', delivery_status = 'completed', updated_at = NOW() WHERE order_id = $1",
        [orderId]
      );

      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
         VALUES ($1, 'deposit', $2, 'success', $3)`,
        [farmerId, releaseAmount, `Admin dispute resolution: Escrow released for order ID ${orderId}`]
      );

      resolutionSummary = `Admin released GH₵ ${releaseAmount.toFixed(2)} to farmer.`;

    } else if (action === 'split') {
      // Custom percentage split between farmer and buyer
      const farmerPct = Math.min(100, Math.max(0, parseFloat(farmer_share_pct) || 50));
      const farmerAmount = (totalOrderAmount * farmerPct) / 100;
      const buyerRefundAmount = totalOrderAmount - farmerAmount;

      const buyerEscrow = parseFloat(buyerWallet.escrow_balance) || 0.00;
      const newBuyerEscrow = Math.max(0, buyerEscrow - totalOrderAmount);
      const newBuyerBalance = (parseFloat(buyerWallet.balance) || 0.00) + buyerRefundAmount;
      const newFarmerBalance = (parseFloat(farmerWallet.balance) || 0.00) + farmerAmount;

      await client.query(
        "UPDATE wallets SET balance = $1, escrow_balance = $2, updated_at = NOW() WHERE user_id = $3",
        [newBuyerBalance, newBuyerEscrow, buyerId]
      );
      await client.query(
        "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2",
        [newFarmerBalance, farmerId]
      );

      await client.query(
        "UPDATE orders SET status = 'delivered', escrow_status = 'released', updated_at = NOW() WHERE order_id = $1",
        [orderId]
      );

      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
         VALUES ($1, 'refund', $2, 'success', $3)`,
        [buyerId, buyerRefundAmount, `Admin dispute resolution: ${100 - farmerPct}% partial refund for order ID ${orderId}`]
      );
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, description) 
         VALUES ($1, 'deposit', $2, 'success', $3)`,
        [farmerId, farmerAmount, `Admin dispute resolution: ${farmerPct}% partial payout for order ID ${orderId}`]
      );

      resolutionSummary = `Admin split escrow: GH₵ ${farmerAmount.toFixed(2)} to farmer (${farmerPct}%), GH₵ ${buyerRefundAmount.toFixed(2)} refunded to buyer.`;

    } else if (action === 'dismiss') {
      resolutionSummary = `Admin dismissed dispute without modifying wallet escrow.`;
    }

    // Mark dispute as resolved and save Admin notes & summary
    await client.query(
      `UPDATE disputes 
       SET status = 'resolved', 
           resolved_at = NOW(), 
           admin_notes = $1, 
           resolution_summary = $2 
       WHERE dispute_id = $3`,
      [notes || 'Resolved by Administrator', resolutionSummary, disputeId]
    );

    // Record audit log
    await client.query(
      `INSERT INTO history (user_id, action_type, reference_id, description) 
       VALUES ($1, 'admin_dispute_resolved', $2, $3)`,
      [adminId, disputeId, `Resolved dispute ID ${disputeId}: ${resolutionSummary}. Notes: ${notes || 'None'}`]
    );

    await client.query("COMMIT");
    res.json({ message: "Dispute resolved successfully.", action, summary: resolutionSummary });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error resolving dispute by admin:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

/* ==========================================================================
   3. User Directory & Account Management
   ========================================================================== */
exports.getUsers = async (req, res) => {
  const { role, search } = req.query;

  try {
    let query = `
      SELECT u.user_id, u.username, u.email, u.phone_number, u.region, u.vehicle_number as vehicle_type, u.created_at,
             COALESCE(u.is_active, true) as is_active,
             r.role,
             w.balance as settled_balance, w.escrow_balance
      FROM users u
      LEFT JOIN roles r ON u.user_id = r.user_id
      LEFT JOIN wallets w ON u.user_id = w.user_id
      WHERE 1=1
    `;
    const params = [];

    if (role && role.trim() !== '') {
      params.push(role.toLowerCase());
      query += ` AND LOWER(r.role::text) = $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.toLowerCase()}%`);
      query += ` AND (LOWER(u.username) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length} OR u.phone_number LIKE $${params.length})`;
    }

    query += ` ORDER BY u.created_at DESC`;

    const result = await pool.query(query, params);

    const users = result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      email: row.email,
      phone: row.phone_number,
      region: row.region,
      vehicleType: row.vehicle_type,
      role: row.role || 'farmer',
      isActive: row.is_active,
      createdAt: row.created_at,
      balance: {
        settled: parseFloat(row.settled_balance) || 0.00,
        escrow: parseFloat(row.escrow_balance) || 0.00
      }
    }));

    res.json(users);
  } catch (err) {
    console.error("❌ Error fetching admin user list:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  const targetUserId = req.params.id;
  const adminId = req.user.user_id;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: "Property 'is_active' (boolean) is required." });
  }

  try {
    // Check if target user has administrator role
    const roleCheck = await pool.query(
      "SELECT role::text FROM roles WHERE user_id = $1",
      [targetUserId]
    );
    if (roleCheck.rows.length > 0 && roleCheck.rows[0].role === 'admin' && !is_active) {
      return res.status(400).json({ error: "Administrator accounts are protected and cannot be suspended." });
    }

    // Ensure column is_active exists, or add dynamically if missing
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true");

    const result = await pool.query(
      "UPDATE users SET is_active = $1, updated_at = NOW() WHERE user_id = $2 RETURNING user_id, username, email, is_active",
      [is_active, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const targetUser = result.rows[0];
    const actionName = is_active ? "user_activated" : "user_suspended";

    await pool.query(
      `INSERT INTO history (user_id, action_type, reference_id, description) 
       VALUES ($1, $2, $3, $4)`,
      [adminId, actionName, targetUserId, `Admin updated user status for ${targetUser.username} (${targetUser.email}) to ${is_active ? 'Active' : 'Suspended'}`]
    );

    res.json({
      message: `User status updated to ${is_active ? 'Active' : 'Suspended'} successfully.`,
      user: {
        userId: targetUser.user_id,
        username: targetUser.username,
        email: targetUser.email,
        isActive: targetUser.is_active
      }
    });
  } catch (err) {
    console.error("❌ Error updating user active status:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};

/* ==========================================================================
   4. Financial Ledger Audit & Transactions
   ========================================================================== */
exports.getAllTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wt.transaction_id, wt.user_id, wt.type, wt.amount, wt.status, wt.description, wt.created_at,
              u.username, u.email, r.role
       FROM wallet_transactions wt
       LEFT JOIN users u ON wt.user_id = u.user_id
       LEFT JOIN roles r ON u.user_id = r.user_id
       ORDER BY wt.created_at DESC`
    );

    const transactions = result.rows.map(row => ({
      id: row.transaction_id,
      userId: row.user_id,
      username: row.username || 'System User',
      email: row.email || 'N/A',
      role: row.role || 'user',
      type: row.type,
      amount: parseFloat(row.amount) || 0.00,
      status: row.status,
      description: row.description,
      createdAt: row.created_at
    }));

    res.json(transactions);
  } catch (err) {
    console.error("❌ Error fetching all transactions for admin:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};

/* ==========================================================================
   5. Fleet Logistics Live Location Tracking
   ========================================================================== */
exports.getFleetLocation = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.job_id, j.order_id, j.transporter_id, j.status as job_status, j.payout, j.updated_at,
              o.transporter_latitude, o.transporter_longitude, o.location_updated_at, o.delivery_status,
              l.crop_name, l.location as pickup_location,
              u.username as transporter_name, u.phone_number as transporter_phone, u.vehicle_number as vehicle_type
       FROM jobs j
       JOIN orders o ON j.order_id = o.order_id
       JOIN listings l ON o.listings_id = l.listing_id
       JOIN users u ON j.transporter_id = u.user_id
       WHERE j.status IN ('assigned', 'picked_up', 'delivered')
       ORDER BY o.location_updated_at DESC NULLS LAST`
    );

    const fleet = result.rows.map(row => ({
      jobId: row.job_id,
      orderId: row.order_id,
      transporterId: row.transporter_id,
      transporterName: row.transporter_name,
      transporterPhone: row.transporter_phone,
      vehicleType: row.vehicle_type || 'Vehicle',
      jobStatus: row.job_status,
      deliveryStatus: row.delivery_status,
      cropName: row.crop_name,
      pickupLocation: row.pickup_location,
      latitude: row.transporter_latitude ? parseFloat(row.transporter_latitude) : null,
      longitude: row.transporter_longitude ? parseFloat(row.transporter_longitude) : null,
      lastLocationUpdate: row.location_updated_at || row.updated_at
    }));

    res.json(fleet);
  } catch (err) {
    console.error("❌ Error fetching fleet location for admin:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};

/* ==========================================================================
   6. Marketplace & Listing Moderation
   ========================================================================== */
exports.deleteListing = async (req, res) => {
  const listingId = req.params.id;
  const adminId = req.user.user_id;

  try {
    const check = await pool.query("SELECT * FROM listings WHERE listing_id = $1", [listingId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Listing not found." });
    }

    await pool.query("DELETE FROM listings WHERE listing_id = $1", [listingId]);

    await pool.query(
      `INSERT INTO history (user_id, action_type, reference_id, description) 
       VALUES ($1, 'admin_listing_deleted', $2, $3)`,
      [adminId, listingId, `Admin removed crop listing ID ${listingId} (${check.rows[0].crop_name})`]
    );

    res.json({ message: "Listing removed successfully." });
  } catch (err) {
    console.error("❌ Error deleting listing by admin:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};

/* ==========================================================================
   7. System Performance & Platform Analytics
   ========================================================================== */
exports.getAnalytics = async (req, res) => {
  try {
    // 1. Gross metrics
    const totalUsersRes = await pool.query("SELECT COUNT(*) as total FROM users");
    const totalUsers = parseInt(totalUsersRes.rows[0].total) || 0;

    const listingsRes = await pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'open') as open_cnt, COUNT(*) FILTER (WHERE status = 'closed') as closed_cnt FROM listings");
    const totalListings = parseInt(listingsRes.rows[0].total) || 0;
    const activeListings = parseInt(listingsRes.rows[0].open_cnt) || 0;
    const soldListings = parseInt(listingsRes.rows[0].closed_cnt) || 0;

    const ordersRes = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'delivered') as completed_cnt,
              COUNT(*) FILTER (WHERE status = 'accepted') as accepted_cnt,
              COALESCE(AVG(price * quantity), 0)::DECIMAL(14,2) as avg_order_val
       FROM orders`
    );
    const totalOrders = parseInt(ordersRes.rows[0].total) || 0;
    const completedOrders = parseInt(ordersRes.rows[0].completed_cnt) || 0;
    const acceptedOrders = parseInt(ordersRes.rows[0].accepted_cnt) || 0;
    const avgContractValue = parseFloat(ordersRes.rows[0].avg_order_val) || 0;

    // Listing Conversion Rate (%)
    const listingConversionRate = totalListings > 0 ? Math.round((soldListings / totalListings) * 100) : 0;

    // Offer Acceptance Rate (%)
    const offerAcceptRate = totalOrders > 0 ? Math.round(((acceptedOrders + completedOrders) / totalOrders) * 100) : 0;

    // 2. Financial Metrics
    const tradeVolumeRes = await pool.query(
      `SELECT COALESCE(SUM(price * quantity), 0)::DECIMAL(14,2) as total_volume FROM orders WHERE status = 'delivered' OR escrow_status IN ('half_released', 'released')`
    );
    const totalTradeVolume = parseFloat(tradeVolumeRes.rows[0].total_volume) || 0;

    const walletSumsRes = await pool.query(
      `SELECT COALESCE(SUM(balance), 0)::DECIMAL(14,2) as total_settled, COALESCE(SUM(escrow_balance), 0)::DECIMAL(14,2) as total_escrow FROM wallets`
    );
    const totalSettledBalance = parseFloat(walletSumsRes.rows[0].total_settled) || 0;
    const totalEscrowBalance = parseFloat(walletSumsRes.rows[0].total_escrow) || 0;

    // 3. Logistics Performance
    const jobsRes = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'delivered') as delivered_cnt,
              COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600), 2.4)::DECIMAL(10,1) as avg_hours
       FROM jobs`
    );
    const totalJobs = parseInt(jobsRes.rows[0].total) || 0;
    const avgDeliveryHours = parseFloat(jobsRes.rows[0].avg_hours) || 2.4;

    // 4. Commodity Breakdown (Top Crops by Order Spend)
    const cropBreakdownRes = await pool.query(
      `SELECT l.crop_name, COUNT(o.order_id) as order_count, COALESCE(SUM(o.price * o.quantity), 0)::DECIMAL(14,2) as total_spend
       FROM orders o
       JOIN listings l ON o.listings_id = l.listing_id
       GROUP BY l.crop_name
       ORDER BY total_spend DESC
       LIMIT 5`
    );

    res.json({
      totalUsers,
      totalListings,
      activeListings,
      soldListings,
      totalOrders,
      completedOrders,
      avgContractValue,
      listingConversionRate,
      offerAcceptRate,
      totalTradeVolume,
      totalSettledBalance,
      totalEscrowBalance,
      totalJobs,
      avgDeliveryHours,
      cropBreakdown: cropBreakdownRes.rows.map(r => ({
        cropName: r.crop_name,
        orderCount: parseInt(r.order_count) || 0,
        totalSpend: parseFloat(r.total_spend) || 0
      }))
    });
  } catch (err) {
    console.error("❌ Error fetching admin analytics:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};
