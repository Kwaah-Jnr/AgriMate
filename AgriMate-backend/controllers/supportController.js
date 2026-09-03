const pool = require("../database");

/* ==========================================================================
   1. User Support & Complaint Submission
   ========================================================================== */
exports.createTicket = async (req, res) => {
  const userId = req.user.user_id;
  const { subject, category, message } = req.body;

  if (!subject || !subject.trim() || !message || !message.trim()) {
    return res.status(400).json({ error: "Subject and message content are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create ticket
    const ticketRes = await client.query(
      `INSERT INTO support_tickets (user_id, subject, category, status) 
       VALUES ($1, $2, $3, 'open') 
       RETURNING ticket_id, user_id, subject, category, status, created_at`,
      [userId, subject.trim(), category || 'general']
    );
    const ticket = ticketRes.rows[0];

    // Create initial message
    await client.query(
      `INSERT INTO support_messages (ticket_id, sender_id, sender_role, message) 
       VALUES ($1, $2, 'user', $3)`,
      [ticket.ticket_id, userId, message.trim()]
    );

    // Audit log
    await client.query(
      `INSERT INTO history (user_id, action_type, reference_id, description) 
       VALUES ($1, 'support_ticket_created', $2, $3)`,
      [userId, ticket.ticket_id, `Submitted support complaint/ticket #${ticket.ticket_id}: ${subject}`]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Support ticket created successfully.", ticket });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error creating support ticket:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

exports.getUserTickets = async (req, res) => {
  const userId = req.user.user_id;
  try {
    const result = await pool.query(
      `SELECT t.ticket_id, t.subject, t.category, t.status, t.created_at, t.updated_at,
              (SELECT message FROM support_messages WHERE ticket_id = t.ticket_id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM support_messages WHERE ticket_id = t.ticket_id ORDER BY created_at DESC LIMIT 1) as last_message_at
       FROM support_tickets t
       WHERE t.user_id = $1
       ORDER BY t.updated_at DESC`,
      [userId]
    );

    const tickets = result.rows.map(row => ({
      ticketId: row.ticket_id,
      subject: row.subject,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at
    }));

    res.json(tickets);
  } catch (err) {
    console.error("❌ Error fetching user tickets:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};

exports.getTicketMessages = async (req, res) => {
  const ticketId = req.params.id;
  const userId = req.user.user_id;
  const userRole = req.user.role;

  try {
    // Check ownership if not admin
    const ticketCheck = await pool.query(
      "SELECT * FROM support_tickets WHERE ticket_id = $1",
      [ticketId]
    );
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const ticket = ticketCheck.rows[0];
    if (userRole !== 'admin' && ticket.user_id !== userId) {
      return res.status(403).json({ error: "Access denied." });
    }

    const messagesRes = await pool.query(
      `SELECT m.message_id, m.ticket_id, m.sender_id, m.sender_role, m.message, m.created_at,
              u.username as sender_name, u.email as sender_email
       FROM support_messages m
       LEFT JOIN users u ON m.sender_id = u.user_id
       WHERE m.ticket_id = $1
       ORDER BY m.created_at ASC`,
      [ticketId]
    );

    const messages = messagesRes.rows.map(row => ({
      messageId: row.message_id,
      ticketId: row.ticket_id,
      senderId: row.sender_id,
      senderRole: row.sender_role,
      senderName: row.sender_name,
      senderEmail: row.sender_email,
      message: row.message,
      createdAt: row.created_at
    }));

    res.json({
      ticket: {
        ticketId: ticket.ticket_id,
        userId: ticket.user_id,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        createdAt: ticket.created_at
      },
      messages
    });
  } catch (err) {
    console.error("❌ Error fetching ticket messages:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};

exports.replyTicket = async (req, res) => {
  const ticketId = req.params.id;
  const userId = req.user.user_id;
  const userRole = req.user.role;
  const { message, status } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message content is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ticketCheck = await client.query(
      "SELECT * FROM support_tickets WHERE ticket_id = $1",
      [ticketId]
    );
    if (ticketCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Ticket not found." });
    }

    const ticket = ticketCheck.rows[0];
    if (userRole !== 'admin' && ticket.user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Access denied." });
    }

    const senderRole = userRole === 'admin' ? 'admin' : 'user';

    // Insert reply message
    await client.query(
      `INSERT INTO support_messages (ticket_id, sender_id, sender_role, message) 
       VALUES ($1, $2, $3, $4)`,
      [ticketId, userId, senderRole, message.trim()]
    );

    // Update ticket status & updated_at
    let newStatus = ticket.status;
    if (userRole === 'admin') {
      newStatus = status || 'in_progress';
    } else if (ticket.status === 'resolved') {
      newStatus = 'open'; // Re-open if user replies
    }

    await client.query(
      "UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE ticket_id = $2",
      [newStatus, ticketId]
    );

    await client.query("COMMIT");
    res.json({ message: "Reply sent successfully.", status: newStatus });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error replying to ticket:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  } finally {
    client.release();
  }
};

/* ==========================================================================
   2. Admin Support & Complaints Management
   ========================================================================== */
exports.getAdminTickets = async (req, res) => {
  const { status } = req.query;

  try {
    let query = `
      SELECT t.ticket_id, t.user_id, t.subject, t.category, t.status, t.created_at, t.updated_at,
             u.username, u.email, u.phone_number, r.role::text as user_role,
             (SELECT message FROM support_messages WHERE ticket_id = t.ticket_id ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT created_at FROM support_messages WHERE ticket_id = t.ticket_id ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM support_tickets t
      JOIN users u ON t.user_id = u.user_id
      LEFT JOIN roles r ON u.user_id = r.user_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status.toLowerCase());
      query += ` AND LOWER(t.status) = $${params.length}`;
    }

    query += ` ORDER BY t.updated_at DESC`;

    const result = await pool.query(query, params);

    const tickets = result.rows.map(row => ({
      ticketId: row.ticket_id,
      userId: row.user_id,
      username: row.username,
      email: row.email,
      phone: row.phone_number,
      userRole: row.user_role || 'user',
      subject: row.subject,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at
    }));

    res.json(tickets);
  } catch (err) {
    console.error("❌ Error fetching admin tickets:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};

exports.updateTicketStatus = async (req, res) => {
  const ticketId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required." });
  }

  try {
    const result = await pool.query(
      "UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE ticket_id = $2 RETURNING ticket_id, status",
      [status, ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    res.json({ message: `Ticket status updated to ${status} successfully.`, ticket: result.rows[0] });
  } catch (err) {
    console.error("❌ Error updating ticket status:", err.message);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};
