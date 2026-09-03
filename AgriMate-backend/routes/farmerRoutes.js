const express = require("express");
const router = express.Router();
const farmerController = require("../controllers/farmerController");
const { authenticateUser, requireRole } = require("../middleware/authMiddleware");

// All routes here require user authentication and the 'farmer' role
router.use(authenticateUser);
router.use(requireRole("farmer"));

/* ==========================================================================
   1. Listings Management Routes
   ========================================================================== */
router.post("/listings", farmerController.createListing);
router.put("/listings/:id", farmerController.updateListing);
router.delete("/listings/:id", farmerController.deleteListing);
router.get("/listings", farmerController.getOwnListings);
router.get("/market-insights", farmerController.getMarketInsights);

/* ==========================================================================
   2. Order / Offer Interaction Routes
   ========================================================================== */
router.get("/offers", farmerController.getOffers);
router.post("/offers/:id/accept", farmerController.acceptOffer);
router.post("/offers/:id/reject", farmerController.rejectOffer);
router.post("/offers/:id/counter", farmerController.counterOffer);
router.post("/orders/:id/fulfill", farmerController.fulfillOrder);
router.get("/orders/:id/location", farmerController.getOrderLocation);

/* ==========================================================================
   3. Wallet & Payments Routes
   ========================================================================== */
router.get("/wallet", farmerController.getWallet);
router.post("/wallet/withdraw", farmerController.withdrawFunds);
router.get("/wallet/history", farmerController.getHistory);

/* ==========================================================================
   4. Ratings & Reputation Routes
   ========================================================================== */
router.get("/ratings/score", farmerController.getAverageScore);
router.get("/ratings", farmerController.getRatings);
router.post("/ratings/:id/reply", farmerController.replyToRating);

/* ==========================================================================
   5. Analytics Routes
   ========================================================================== */
router.get("/analytics", farmerController.getAnalytics);
router.get("/dashboard", farmerController.getDashboardSummary);

module.exports = router;
