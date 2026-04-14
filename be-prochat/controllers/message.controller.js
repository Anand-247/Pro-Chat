const { Message, User, Conversation, ConversationMember, MessageReceipt, MessageDeletion, MessageReaction, MessageEdit, ChatClear } = require("../models");
const { Op } = require("sequelize");

// @desc    Send a new message
// @route   POST /api/message
// @access  Protected
exports.sendMessage = async (req, res) => {
  const { content, chatId, type, mediaUrl } = req.body;

  if (!content && !mediaUrl) {
    return res.status(400).json({ message: "Content or Media is required" });
  }
  if (!chatId) {
    return res.status(400).json({ message: "chatId is required" });
  }

  try {
    const newMessage = await Message.create({
      senderId: req.user.id,
      content,
      conversationId: chatId,
      type: type || "text",
      mediaUrl,
    });

    // Populate MessageReceipts for all active members
    const members = await ConversationMember.findAll({
       where: { conversationId: chatId, leftAt: null }
    });

    const receipts = members
      .filter(m => m.userId !== req.user.id)
      .map(m => ({
        messageId: newMessage.id,
        userId: m.userId,
      }));

    if (receipts.length > 0) {
       await MessageReceipt.bulkCreate(receipts);
    }

    const fullMessage = await Message.findByPk(newMessage.id, {
      include: [
        { model: User, as: "sender", attributes: ["name", "avatar"] },
        { 
          model: Conversation,
          as: "chat",
          include: [{ model: User, as: "users", attributes: ["id", "name", "email", "avatar"] }]
        },
        { model: MessageReceipt }
      ],
    });

    // Update the latest message of the chat
    await Conversation.update(
      { latestMessageId: newMessage.id },
      { where: { id: chatId } }
    );

    res.json(fullMessage);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

// @desc    Fetch all messages for a chat with pagination
// @route   GET /api/message/:chatId?limit=50&offset=0
// @access  Protected
exports.allMessages = async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const membership = await ConversationMember.findOne({
      where: { conversationId: req.params.chatId, userId: req.user.id },
      paranoid: false
    });
    
    if (!membership) {
        return res.status(403).json({ message: "Not a member" });
    }

    // Check for clear chat timestamp
    const chatClear = await ChatClear.findOne({
       where: { conversationId: req.params.chatId, userId: req.user.id }
    });
    
    let startTime = membership.joinedAt || membership.createdAt;
    if (chatClear && chatClear.clearedBefore > startTime) {
       startTime = chatClear.clearedBefore;
    }

    let timeBounds = { [Op.gte]: startTime };
    if (membership.leftAt) {
       // Add 10s buffer to capture the system message that follows removal
       timeBounds[Op.lte] = new Date(membership.leftAt.getTime() + 10000);
    }

    // Get IDs of messages deleted "for me"
    const deletedForMe = await MessageDeletion.findAll({
       where: { userId: req.user.id },
       attributes: ["messageId"]
    });
    const deletedMsgIds = deletedForMe.map(d => d.messageId);

    const messages = await Message.findAll({
      where: { 
        conversationId: req.params.chatId,
        sentAt: timeBounds,
        id: { [Op.notIn]: deletedMsgIds },
        deletedAt: null // Not deleted for everyone
      },
      include: [
        { model: User, as: "sender", attributes: ["name", "avatar", "email"] },
        { model: MessageReaction, include: [{ model: User, attributes: ["name"] }] },
        { model: MessageReceipt }
      ],
      order: [["sentAt", "ASC"]],
      limit,
      offset
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/message/:id?target=me|everyone
// @access  Protected
exports.deleteMessage = async (req, res) => {
  const target = req.query.target || "everyone";

  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (target === "everyone") {
      if (message.senderId !== req.user.id) {
         return res.status(403).json({ message: "Cannot delete others' messages for everyone" });
      }
      message.deletedAt = new Date();
      await message.save();
      return res.json({ id: message.id, type: "everyone" });
    } else {
      await MessageDeletion.upsert({
         messageId: message.id,
         userId: req.user.id
      });
      return res.json({ id: message.id, type: "me" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to delete message", error: error.message });
  }
};

// @desc    React to a message
// @route   PUT /api/message/:id/react
// @access  Protected
exports.reactToMessage = async (req, res) => {
  const { emoji } = req.body;
  try {
     if (!emoji) {
        // Remove reaction
        await MessageReaction.destroy({
           where: { messageId: req.params.id, userId: req.user.id }
        });
     } else {
        await MessageReaction.upsert({
           messageId: req.params.id,
           userId: req.user.id,
           emoji
        });
     }
     
     const updatedMessage = await Message.findByPk(req.params.id, {
        include: [{ model: MessageReaction }]
     });
     
     res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: "Failed to react to message", error: error.message });
  }
};

// @desc    Edit a message
// @route   PUT /api/message/:id
// @access  Protected
exports.editMessage = async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: "Content is required" });

  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.senderId !== req.user.id) {
       return res.status(403).json({ message: "Cannot edit others' messages" });
    }

    if (message.deletedAt) {
       return res.status(400).json({ message: "Cannot edit a deleted message" });
    }

    // Capture edit history
    await MessageEdit.create({
       messageId: message.id,
       oldContent: message.content,
       newContent: content
    });

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to edit message", error: error.message });
  }
};

// @desc    Clear entire chat history for a user
// @route   DELETE /api/message/clear/:chatId
// @access  Protected
exports.clearChat = async (req, res) => {
  try {
     await ChatClear.upsert({
        conversationId: req.params.chatId,
        userId: req.user.id,
        clearedBefore: new Date()
     });
     res.json({ message: "Chat cleared successfully" });
  } catch (error) {
     res.status(500).json({ message: "Failed to clear chat", error: error.message });
  }
};
