const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  updateMemberRole,
  deleteChat,
} = require("../controllers/chat.controller");

router.route("/").post(authMiddleware, accessChat);
router.route("/").get(authMiddleware, fetchChats);
router.route("/:id").delete(authMiddleware, deleteChat);
router.route("/group").post(authMiddleware, createGroupChat);
router.route("/rename").put(authMiddleware, renameGroup);
router.route("/groupadd").put(authMiddleware, addToGroup);
router.route("/groupremove").put(authMiddleware, removeFromGroup);
router.route("/groupadmin").put(authMiddleware, updateMemberRole);

module.exports = router;
