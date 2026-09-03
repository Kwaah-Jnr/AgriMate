const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticateUser, requireAdmin } = require("../middleware/authMiddleware");

// All admin routes require JWT authentication and admin role privileges
router.use(authenticateUser);
router.use(requireAdmin);

// 1. Overview & Summary KPIs
router.get("/summary", adminController.getSummary);

// 2. Dispute Adjudication Center
router.get("/disputes", adminController.getDisputes);
router.post("/disputes/:id/resolve", adminController.resolveDispute);

// 3. User Directory & Account Actions
router.get("/users", adminController.getUsers);
router.patch("/users/:id/status", adminController.updateUserStatus);

// 4. Financial Ledger Audit & Transactions
router.get("/transactions", adminController.getAllTransactions);

// 5. Fleet Logistics Live Location Tracking
router.get("/fleet", adminController.getFleetLocation);

// 6. Listing Moderation
router.delete("/listings/:id", adminController.deleteListing);

// 7. System Performance Analytics
router.get("/analytics", adminController.getAnalytics);

module.exports = router;
