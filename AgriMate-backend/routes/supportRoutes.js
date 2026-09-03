const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");
const { authenticateUser, requireAdmin } = require("../middleware/authMiddleware");

// All support routes require JWT authentication
router.use(authenticateUser);

// --- User Routes (Farmers, Buyers, Transporters) ---
router.post("/tickets", supportController.createTicket);
router.get("/tickets", supportController.getUserTickets);
router.get("/tickets/:id/messages", supportController.getTicketMessages);
router.post("/tickets/:id/reply", supportController.replyTicket);

// --- Admin Routes ---
router.get("/admin/tickets", requireAdmin, supportController.getAdminTickets);
router.patch("/admin/tickets/:id/status", requireAdmin, supportController.updateTicketStatus);

module.exports = router;
