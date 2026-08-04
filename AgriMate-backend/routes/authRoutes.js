const express = require("express");
const router = express.Router();
const { loginUser, verifyGoogleToken, verifyAppleToken } = require("../controllers/authController");

router.post("/login", loginUser);
router.post("/google", verifyGoogleToken);
router.post("/apple", verifyAppleToken);

module.exports = router;