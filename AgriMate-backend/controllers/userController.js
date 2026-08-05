const pool = require("../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "agrimate_secret_key";

// Logic to register a new user
const registerUser = async (req, res) => {
  const { full_name, fullName, username, email, phone, phone_number, phoneNumber, region, password, pin, role, vehicle_number, vehicleNumber } = req.body;

  const usernameVal = username || fullName || full_name;
  const emailVal = email;
  const phoneVal = phone || phone_number || phoneNumber;
  const passwordVal = password || pin;
  const roleVal = role ? String(role).trim().toLowerCase() : 'farmer';
  const vehicleNumVal = vehicle_number || vehicleNumber || null;

  if (!usernameVal || !emailVal || !passwordVal) {
    return res.status(400).json({ error: "Username/Full name, email, and password/pin are required fields." });
  }

  if (roleVal !== 'farmer' && roleVal !== 'buyer' && roleVal !== 'transporter') {
    return res.status(400).json({ error: "Role must be 'farmer', 'buyer', or 'transporter'." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Hash the password/pin before storing it in the database
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordVal, salt);

    // 2. Insert User into the users table
    const newUser = await client.query(
      "INSERT INTO users (username, phone_number, email, pin, region, vehicle_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, username, email, phone_number, region, vehicle_number",
      [usernameVal, phoneVal || null, emailVal, hashedPassword, region || null, vehicleNumVal]
    );

    const userId = newUser.rows[0].user_id;

    // 3. Insert Role into roles table
    await client.query(
      "INSERT INTO roles (user_id, role) VALUES ($1, $2)",
      [userId, roleVal]
    );

    // 4. Save everything to the database
    await client.query("COMMIT");

    // Generate JWT token for auto-login
    const token = jwt.sign(
      {
        user_id: userId,
        fullName: newUser.rows[0].username,
        username: newUser.rows[0].username,
        email: newUser.rows[0].email,
        role: roleVal,
        region: newUser.rows[0].region,
        vehicleNumber: newUser.rows[0].vehicle_number
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "User and Role registered successfully!",
      token,
      user: {
        user_id: userId,
        username: newUser.rows[0].username,
        email: newUser.rows[0].email,
        phone_number: newUser.rows[0].phone_number,
        region: newUser.rows[0].region,
        role: roleVal,
        vehicleNumber: newUser.rows[0].vehicle_number
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error registering user");
    console.error("Error details:", err.message);
    res.status(500).json({ error: "Internal server error or user already exists: " + err.message });
  } finally {
    client.release();
  }
};


module.exports = { registerUser };