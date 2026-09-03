const jwt = require("jsonwebtoken");
const pool = require("../database");

const JWT_SECRET = process.env.JWT_SECRET || "agrimate_secret_key";

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Missing or invalid Authorization header." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Decoded payload contains: { user_id, username, role, region, vehicleNumber }
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Error in auth middleware:", err.message);
    return res.status(401).json({ error: "Unauthorized. Invalid token." });
  }
};

const requireRole = (allowedRole) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== allowedRole) {
      return res.status(403).json({ error: `Forbidden. Requires the '${allowedRole}' role.` });
    }
    next();
  };
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden. Administrative privileges required." });
  }
  next();
};

module.exports = {
  authenticateUser,
  requireRole,
  requireAdmin,
};
