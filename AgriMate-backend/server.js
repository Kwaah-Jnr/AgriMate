const express = require("express");
const cors = require("cors");
const pool = require("./database");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const farmerRoutes = require("./routes/farmerRoutes");
const buyerRoutes = require("./routes/buyerRoutes");
const transporterRoutes = require("./routes/transporterRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/farmer", farmerRoutes);
app.use("/api/buyer", buyerRoutes);
app.use("/api/transporter", transporterRoutes);

//Basic welcome route
app.get("/", (req, res) => {
  res.send("Welcome to AgriMate API!");
});

// Test route to check if the server is working
app.get("/test-db", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW() as current_time");
    client.release();
    res.json({ message: "Database connection is working!", time: result.rows[0].current_time });
  } catch (err) {
    console.error("❌ Error testing database connection");
    console.error("Error details:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error("❌ Server failed to start:");
  console.error(err);
  process.exit(1);
});