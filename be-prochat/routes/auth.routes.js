const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Protected route example
router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "Protected profile accessed", user: req.user });
});

module.exports = router;
