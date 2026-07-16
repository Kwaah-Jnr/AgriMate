const express = require("express");
const router = express.Router();
const buyerController = require("../controllers/buyerController");
const { authenticateUser, requireRole } = require("../middleware/authMiddleware");

// All routes here require user authentication and the 'buyer' role
router.use(authenticateUser);
router.use(requireRole("buyer"));

/* ==========================================================================
   1. Listings Discovery Routes
   ========================================================================== */
router.get("/listings", buyerController.getListings);
router.get("/market-insights", buyerController.getMarketInsights);

/* ==========================================================================
   2. Offers & Orders Routes
   ========================================================================== */
router.post("/offers", buyerController.placeOffer);
router.get("/offers", buyerController.getBuyerOffers);
router.put("/offers/:id", buyerController.updateOffer);
router.delete("/offers/:id", buyerController.cancelOffer);
router.get("/orders", buyerController.getOwnOrders);
router.get("/orders/:id/location", buyerController.getOrderLocation);

/* ==========================================================================
   3. Payments & Escrow Routes
   ========================================================================== */
router.post("/orders/:id/fund", buyerController.fundEscrow);
router.get("/payments", buyerController.getPaymentHistory);
router.post("/wallet/deposit", buyerController.depositFunds);

/* ==========================================================================
   4. Ratings & Reputation Routes
   ========================================================================== */
router.post("/ratings", buyerController.rateFarmer);
router.get("/farmers/:id", buyerController.getFarmerProfile);
router.post("/orders/:id/dispute", buyerController.raiseDispute);
router.post("/orders/:id/self-pickup", buyerController.selfPickup);
router.post("/orders/:id/resolve-dispute", buyerController.resolveDispute);
router.get("/disputes", buyerController.getBuyerDisputes);
router.post("/disputes/:id/resolve", buyerController.resolveDisputeById);

/* ==========================================================================
   5. Analytics Routes
   ========================================================================== */
router.get("/analytics", buyerController.getAnalytics);
router.get("/dashboard", buyerController.getDashboardSummary);

module.exports = router;
