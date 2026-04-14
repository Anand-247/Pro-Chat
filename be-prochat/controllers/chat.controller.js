const { Conversation, User, Message, ConversationMember, GroupHistory, MessageReceipt } = require("../models");
const { Op } = require("sequelize");

// @desc    Access or create 1-on-1 chat
// @route   POST /api/chat
// @access  Protected
exports.accessChat = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "UserId param not sent with request" });
  }

  try {
    // Check if a 1-on-1 chat already exists between the two users
    const userConversations = await Conversation.findAll({
      where: { type: "dm" },
      include: [
        {
          model: User,
          as: "users",
          where: { id: { [Op.in]: [req.user.id, userId] } },
        },
      ],
    });

    // Filter to find the exact chat with both users
    const existingChat = userConversations.find((chat) => chat.users.length === 2);

    if (existingChat) {
      // Fetch full chat with latest message
      const fullChat = await Conversation.findByPk(existingChat.id, {
        include: [
          { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] } },
          { 
            model: Message, 
            as: "latestMessage",
            include: [{ model: User, as: "sender", attributes: ["name", "email", "avatar"] }]
          },
        ],
      });
      return res.status(200).json(fullChat);
    }

    // Create a new chat
    const newChat = await Conversation.create({
      type: "dm",
      createdBy: req.user.id,
    });

    // Add both users to chat
    await ConversationMember.bulkCreate([
      { userId: req.user.id, conversationId: newChat.id, role: "member" },
      { userId: userId, conversationId: newChat.id, role: "member" },
    ]);

    const fullChat = await Conversation.findByPk(newChat.id, {
      include: [
        { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] } },
      ],
    });

    res.status(200).json(fullChat);
  } catch (error) {
    res.status(500).json({ message: "Failed to access chat", error: error.message });
  }
};

// @desc    Fetch all chats for a user
// @route   GET /api/chat
// @access  Protected
exports.fetchChats = async (req, res) => {
  try {
    const memberships = await ConversationMember.findAll({
      where: { userId: req.user.id },
      attributes: ["conversationId"],
    });

    const conversationIds = memberships.map((c) => c.conversationId);

    const results = await Conversation.findAll({
      where: { id: { [Op.in]: conversationIds } },
      include: [
        { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] } },
        { model: User, as: "creator", attributes: ["id", "name", "email", "avatar"] },
        {
          model: Message,
          as: "latestMessage",
          include: [
            { model: User, as: "sender", attributes: ["name", "email", "avatar"] },
            { model: MessageReceipt }
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch chats", error: error.message });
  }
};

// @desc    Create New Group Chat
// @route   POST /api/chat/group
// @access  Protected
exports.createGroupChat = async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: "Please Fill all the fields" });
  }

  let users = JSON.parse(req.body.users);

  if (users.length < 2) {
    return res.status(400).send("More than 2 users are required to form a group chat");
  }

  users.push(req.user.id);

  try {
    const groupChat = await Conversation.create({
      name: req.body.name,
      type: "group",
      createdBy: req.user.id,
    });

    const chatMembers = users.map((id) => ({
      userId: id,
      conversationId: groupChat.id,
      role: id === req.user.id ? "owner" : "member",
    }));

    await ConversationMember.bulkCreate(chatMembers);

    // Initial history log
    await GroupHistory.create({
      conversationId: groupChat.id,
      actorId: req.user.id,
      event: "created",
    });

    const fullGroupChat = await Conversation.findByPk(groupChat.id, {
      include: [
        { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] } },
        { model: User, as: "creator", attributes: ["id", "name", "email", "avatar"] },
      ],
    });

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(500).json({ message: "Failed to create group", error: error.message });
  }
};

// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected (Admin only)
exports.renameGroup = async (req, res) => {
  const { chatId, chatName } = req.body;

  try {
    const chat = await Conversation.findByPk(chatId);
    if (!chat) return res.status(404).json({ message: "Conversation Not Found" });
    
    // Check if user is admin/owner
    const membership = await ConversationMember.findOne({
       where: { conversationId: chatId, userId: req.user.id }
    });

    if (!membership || (membership.role !== "admin" && membership.role !== "owner")) {
       return res.status(403).json({ message: "Only admins can rename the group" });
    }

    const oldName = chat.name;
    chat.name = chatName;
    await chat.save();

    await GroupHistory.create({
       conversationId: chatId,
       actorId: req.user.id,
       event: "renamed",
       meta: { oldName, newName: chatName }
    });

    const updatedChat = await Conversation.findByPk(chatId, {
      include: [
        { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] } },
      ],
    });

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: "Failed to rename group", error: error.message });
  }
};

// @desc    Add user to Group
// @route   PUT /api/chat/groupadd
// @access  Protected
exports.addToGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  try {
    const chat = await Conversation.findByPk(chatId);
    if (!chat) return res.status(404).json({ message: "Conversation Not Found" });

    // Check admin rights
    const adminMembership = await ConversationMember.findOne({
        where: { conversationId: chatId, userId: req.user.id }
    });

    if (!adminMembership || (adminMembership.role !== "admin" && adminMembership.role !== "owner")) {
        return res.status(403).json({ message: "Only admins can add members" });
    }

    const membership = await ConversationMember.findOne({ 
       where: { conversationId: chatId, userId }, 
       paranoid: false 
    });
    
    if (membership) {
       if (membership.leftAt || membership.deletedAt) {
          membership.leftAt = null;
          membership.leftReason = null;
          membership.removedBy = null;
          if (membership.deletedAt) await membership.restore();
          else await membership.save();
       } else {
          return res.status(400).json({ message: "User already in group" });
       }
    } else {
       await ConversationMember.create({ conversationId: chatId, userId });
    }

    await GroupHistory.create({
       conversationId: chatId,
       actorId: req.user.id,
       targetUserId: userId,
       event: "joined",
    });

    const updatedChat = await Conversation.findByPk(chatId, {
      include: [
        { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] } },
      ],
    });

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: "Error adding to group", error: error.message });
  }
};

// @desc    Remove user from Group / Leave
// @route   PUT /api/chat/groupremove
// @access  Protected
exports.removeFromGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  try {
     const chat = await Conversation.findByPk(chatId);
     if (!chat) return res.status(404).json({ message: "Conversation Not Found" });

     // User can leave themselves
     if (req.user.id === userId) {
        await ConversationMember.update(
           { leftAt: new Date(), leftReason: "self" },
           { where: { conversationId: chatId, userId } }
        );
        
        await GroupHistory.create({
           conversationId: chatId,
           actorId: userId,
           event: "left",
        });
     } else {
        // Admin removing someone
        const adminMembership = await ConversationMember.findOne({
            where: { conversationId: chatId, userId: req.user.id }
        });

        if (!adminMembership || (adminMembership.role !== "admin" && adminMembership.role !== "owner")) {
            return res.status(403).json({ message: "Only admins can remove members" });
        }

        await ConversationMember.update(
           { leftAt: new Date(), leftReason: "removed", removedBy: req.user.id },
           { where: { conversationId: chatId, userId } }
        );

        await GroupHistory.create({
           conversationId: chatId,
           actorId: req.user.id,
           targetUserId: userId,
           event: "removed",
        });
     }

     const updatedChat = await Conversation.findByPk(chatId, {
       include: [
         { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] }, through: { paranoid: false } },
       ],
     });

     res.json(updatedChat);
  } catch (error) {
     res.status(500).json({ message: "Error removing from group", error: error.message });
  }
};

// @desc    Update Member Role (Promote/Demote admin)
// @route   PUT /api/chat/groupadmin
// @access  Protected (Owner/Admin only)
exports.updateMemberRole = async (req, res) => {
  const { chatId, userId, role } = req.body;

  if (!["admin", "member"].includes(role)) {
     return res.status(400).json({ message: "Invalid role specified" });
  }

  try {
     const chat = await Conversation.findByPk(chatId);
     if (!chat) return res.status(404).json({ message: "Conversation Not Found" });

     // Actor membership check
     const actorMembership = await ConversationMember.findOne({
        where: { conversationId: chatId, userId: req.user.id }
     });

     if (!actorMembership || (actorMembership.role !== "admin" && actorMembership.role !== "owner")) {
        return res.status(403).json({ message: "Only admins/owners can update roles" });
     }

     const targetMembership = await ConversationMember.findOne({
        where: { conversationId: chatId, userId }
     });

     if (!targetMembership) {
        return res.status(404).json({ message: "User is not a member of this group" });
     }

     // Security: Only Owner can demote an Admin
     if (targetMembership.role === "admin" && role === "member" && actorMembership.role !== "owner") {
        return res.status(403).json({ message: "Only the group owner can demote an admin" });
     }

     const oldRole = targetMembership.role;
     targetMembership.role = role;
     await targetMembership.save();

     await GroupHistory.create({
        conversationId: chatId,
        actorId: req.user.id,
        targetUserId: userId,
        event: role === "admin" ? "promoted" : "demoted",
        meta: { oldRole, newRole: role }
     });

     const updatedChat = await Conversation.findByPk(chatId, {
       include: [
         { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] } },
       ],
     });

     res.json(updatedChat);
  } catch (error) {
     res.status(500).json({ message: "Error updating member role", error: error.message });
  }
};

// @desc    Delete or Leave a Chat (List view removal)
// @route   DELETE /api/chat/:id
// @access  Protected
exports.deleteChat = async (req, res) => {
  try {
     const chat = await Conversation.findByPk(req.params.id);
     if (!chat) return res.status(404).json({ message: "Conversation Not Found" });
     
     // This is "List removal" - just marks it for the user
     await ConversationMember.destroy({ where: { conversationId: chat.id, userId: req.user.id } });
     res.json({ message: "Successfully removed from conversation list" });
  } catch (error) {
     res.status(500).json({ message: "Error deleting chat", error: error.message });
  }
};
