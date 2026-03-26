const { Chat, User, Message, ChatMember } = require("../models");
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
    const userChats = await Chat.findAll({
      where: { isGroupChat: false },
      include: [
        {
          model: User,
          as: "users",
          where: { id: { [Op.in]: [req.user.id, userId] } },
        },
      ],
    });

    // Filter to find the exact chat with both users
    const existingChat = userChats.find((chat) => chat.users.length === 2);

    if (existingChat) {
      // Fetch full chat with latest message
      const fullChat = await Chat.findByPk(existingChat.id, {
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
    const newChat = await Chat.create({
      name: "sender",
      isGroupChat: false,
    });

    // Add both users to chat
    await ChatMember.bulkCreate([
      { userId: req.user.id, chatId: newChat.id },
      { userId: userId, chatId: newChat.id },
    ]);

    const fullChat = await Chat.findByPk(newChat.id, {
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
    const userChats = await ChatMember.findAll({
      where: { userId: req.user.id },
      attributes: ["chatId"],
      paranoid: false,
    });

    const chatIds = userChats.map((c) => c.chatId);

    const results = await Chat.findAll({
      where: { id: { [Op.in]: chatIds } },
      include: [
        { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] }, through: { paranoid: false } },
        { model: User, as: "groupAdmin", attributes: ["id", "name", "email", "avatar"] },
        {
          model: Message,
          as: "latestMessage",
          include: [{ model: User, as: "sender", attributes: ["name", "email", "avatar"] }],
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
    const groupChat = await Chat.create({
      name: req.body.name,
      isGroupChat: true,
      groupAdminId: req.user.id,
    });

    const chatMembers = users.map((id) => ({
      userId: id,
      chatId: groupChat.id,
      role: id === req.user.id ? "admin" : "member",
    }));

    await ChatMember.bulkCreate(chatMembers);

    const fullGroupChat = await Chat.findByPk(groupChat.id, {
      include: [
        { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] } },
        { model: User, as: "groupAdmin", attributes: ["id", "name", "email", "avatar"] },
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
    const chat = await Chat.findByPk(chatId);
    if (!chat) return res.status(404).json({ message: "Chat Not Found" });
    
    // Check if user is admin
    if (chat.groupAdminId !== req.user.id) {
       return res.status(403).json({ message: "Only admins can rename the group" });
    }

    chat.name = chatName;
    await chat.save();

    const updatedChat = await Chat.findByPk(chatId, {
      include: [
        { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] } },
        { model: User, as: "groupAdmin", attributes: ["id", "name", "email", "avatar"] },
      ],
    });

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: "Failed to rename group", error: error.message });
  }
};

// @desc    Add user to Group / Leave
// @route   PUT /api/chat/groupadd
// @access  Protected
exports.addToGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  try {
    const chat = await Chat.findByPk(chatId);
    if (!chat) return res.status(404).json({ message: "Chat Not Found" });

    if (chat.groupAdminId !== req.user.id) {
        return res.status(403).json({ message: "Only admins can add members" });
    }

    const membership = await ChatMember.findOne({ where: { chatId, userId }, paranoid: false });
    
    if (membership) {
       if (membership.deletedAt) {
          // They left previously, restore their junction mapping!
          await membership.restore();
       } else {
          return res.status(400).json({ message: "User already in group" });
       }
    } else {
       await ChatMember.create({ chatId, userId });
    }

    const updatedChat = await Chat.findByPk(chatId, {
      include: [
        { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] } },
        { model: User, as: "groupAdmin", attributes: ["id", "name", "email", "avatar"] },
      ],
    });

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: "Error adding to group", error: error.message });
  }
};

// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
// @access  Protected
exports.removeFromGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  try {
     const chat = await Chat.findByPk(chatId);
     if (!chat) return res.status(404).json({ message: "Chat Not Found" });

     // User can leave themselves, or admin can remove them
     if (req.user.id !== userId && chat.groupAdminId !== req.user.id) {
         return res.status(403).json({ message: "Only admins can remove members" });
     }

     await ChatMember.destroy({ where: { chatId, userId } });

     const updatedChat = await Chat.findByPk(chatId, {
       include: [
         { model: User, as: "users", attributes: { exclude: ["password", "refreshToken"] }, through: { paranoid: false } },
         { model: User, as: "groupAdmin", attributes: ["id", "name", "email", "avatar"] },
       ],
     });

     res.json(updatedChat);
  } catch (error) {
     res.status(500).json({ message: "Error removing from group", error: error.message });
  }
};

// @desc    Delete or Leave a Chat
// @route   DELETE /api/chat/:id
// @access  Protected
exports.deleteChat = async (req, res) => {
  try {
     const chat = await Chat.findByPk(req.params.id);
     if (!chat) return res.status(404).json({ message: "Chat Not Found" });
     
     // Remove user from ChatMember (Soft Delete)
     await ChatMember.destroy({ where: { chatId: chat.id, userId: req.user.id } });
     res.json({ message: "Successfully removed from chat" });
  } catch (error) {
     res.status(500).json({ message: "Error deleting chat", error: error.message });
  }
};
