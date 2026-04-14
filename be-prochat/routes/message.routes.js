const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { sendMessage, allMessages, deleteMessage, editMessage, reactToMessage, clearChat } = require("../controllers/message.controller");

router.route("/").post(authMiddleware, sendMessage);
router.route("/clear/:chatId").delete(authMiddleware, clearChat);
router.route("/:chatId").get(authMiddleware, allMessages);
router.route("/:id").put(authMiddleware, editMessage).delete(authMiddleware, deleteMessage);
router.route("/:id/react").put(authMiddleware, reactToMessage);

module.exports = router;
