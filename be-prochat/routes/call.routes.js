const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { getCallHistory, logCall } = require("../controllers/call.controller");

router.route("/").get(authMiddleware, getCallHistory);
router.route("/").post(authMiddleware, logCall);

module.exports = router;
