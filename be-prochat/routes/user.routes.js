const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { allUsers, updateProfile, registerPushToken } = require("../controllers/user.controller");

router.route("/").get(authMiddleware, allUsers);
router.route("/profile").put(authMiddleware, updateProfile);
router.route("/push-token").post(authMiddleware, registerPushToken);

module.exports = router;
