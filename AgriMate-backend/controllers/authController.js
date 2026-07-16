const pool = require("../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "agrimate_secret_key";

const loginUser = async (req, res) => {
  const { identifier, emailOrUsername, password, pin } = req.body;
  const identifierVal = identifier || emailOrUsername;
  const passwordVal = password || pin;

  try {
    // 1. Look for the user by username, phone number, or email and fetch their role and vehicle number
    const userResult = await pool.query(
      `SELECT u.user_id, u.username, u.phone_number, u.email, u.pin, u.region, u.vehicle_number, r.role 
       FROM users u 
       LEFT JOIN roles r ON u.user_id = r.user_id 
       WHERE u.username = $1 OR u.phone_number = $1 OR u.email = $1`,
      [identifierVal]
    );

    // 2. Check if user exists
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userResult.rows[0];

    // 3. Check if the provided PIN/password matches the stored hashed PIN/password
    if (!passwordVal) {
      return res.status(400).json({ error: "Password or PIN is required" });
    }
    const isMatch = await bcrypt.compare(passwordVal, user.pin);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        region: user.region,
        vehicleNumber: user.vehicle_number
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 5. If everything is correct, return token and user info (excluding PIN) and role
    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user.user_id,
        username: user.username,
        phone_number: user.phone_number,
        email: user.email,
        region: user.region,
        role: user.role,
        vehicleNumber: user.vehicle_number
      },
    });
  } catch (err) {
    console.error("❌ Error logging in user");
    console.error("Error details:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { loginUser };