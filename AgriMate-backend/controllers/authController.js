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

    // 4. Generate JWT with fullName included
    const token = jwt.sign(
      {
        user_id: user.user_id,
        fullName: user.username,
        username: user.username,
        email: user.email,
        role: user.role,
        region: user.region,
        vehicleNumber: user.vehicle_number
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 5. Return token and user info
    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user.user_id,
        fullName: user.username,
        username: user.username,
        phone_number: user.phone_number,
        email: user.email,
        region: user.region,
        role: user.role,
        vehicleNumber: user.vehicle_number
      },
    });
  } catch (err) {
    console.error("❌ Error logging in user:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const verifyGoogleToken = async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: "Google OAuth token is required" });
  }

  // Reject mock tokens in production flow
  if (token.startsWith("mock-jwt-token-")) {
    return res.status(400).json({ error: "Mock social tokens are not allowed in full authentication mode. Please sign in with your email or username." });
  }

  try {
    // NOTE: Google OAuth is a stub — user_id is null until full Google Identity integration is implemented.
    // Without a real user_id, protected routes will not be able to query the database correctly.
    // For now, reject Google sign-in with a clear message so users use email login.
    return res.status(501).json({
      error: "Google Sign-In is not yet fully integrated. Please use email/password login to access your account."
    });
  } catch (err) {
    res.status(500).json({ error: "Google verification failed: " + err.message });
  }
};

const verifyAppleToken = async (req, res) => {
  const { token, fullName } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: "Apple OAuth token is required" });
  }

  if (token.startsWith("mock-jwt-token-")) {
    return res.status(400).json({ error: "Mock social tokens are not allowed in full authentication mode. Please sign in with your email or username." });
  }

  try {
    // NOTE: Apple OAuth is a stub — user_id is null until full Apple Identity integration is implemented.
    // Without a real user_id, protected routes will not be able to query the database correctly.
    // For now, reject Apple sign-in with a clear message so users use email login.
    return res.status(501).json({
      error: "Apple Sign-In is not yet fully integrated. Please use email/password login to access your account."
    });
  } catch (err) {
    res.status(500).json({ error: "Apple verification failed: " + err.message });
  }
};

module.exports = { loginUser, verifyGoogleToken, verifyAppleToken };