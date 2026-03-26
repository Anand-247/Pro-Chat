const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { allUsers, updateProfile } = require("../controllers/user.controller");

router.route("/").get(authMiddleware, allUsers);
router.route("/profile").put(authMiddleware, updateProfile);

module.exports = router;
