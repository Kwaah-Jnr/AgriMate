const express = require("express");
const router = express.Router();
const transporterController = require("../controllers/transporterController");
const { authenticateUser, requireRole } = require("../middleware/authMiddleware");

// All routes here require user authentication and the 'transporter' role
router.use(authenticateUser);
router.use(requireRole("transporter"));

/* ==========================================================================
   1. Job Discovery & Assignment Routes
   ========================================================================== */
router.get("/jobs/available", transporterController.getAvailableJobs);
router.post("/jobs/:id/claim", transporterController.claimJob);

/* ==========================================================================
   2. Delivery Workflow Routes
   ========================================================================== */
router.post("/jobs/:id/confirm-pickup", transporterController.confirmPickup);
router.post("/jobs/:id/confirm-delivery", transporterController.confirmDelivery);
router.post("/jobs/:id/location", transporterController.updateJobLocation);

/* ==========================================================================
   3. Payments & Earnings Routes
   ========================================================================== */
router.get("/earnings", transporterController.getEarnings);
router.get("/wallet", transporterController.getWallet);
router.post("/wallet/withdraw", transporterController.withdrawFunds);

/* ==========================================================================
   4. Ratings & Reputation Routes
   ========================================================================== */
router.post("/ratings", transporterController.rateUser);
router.get("/ratings", transporterController.getRatings);

/* ==========================================================================
   5. Analytics Routes
   ========================================================================== */
router.get("/analytics", transporterController.getAnalytics);

module.exports = router;
