const { Message, User, Chat, ChatMember } = require("../models");
const { Op } = require("sequelize");

// @desc    Send a new message
// @route   POST /api/message
// @access  Protected
exports.sendMessage = async (req, res) => {
  const { content, chatId, type } = req.body;

  if (!content || !chatId) {
    return res.status(400).json({ message: "Invalid data passed into request" });
  }

  try {
    const newMessage = await Message.create({
      senderId: req.user.id,
      content,
      chatId,
      type: type || "text",
    });

    const fullMessage = await Message.findByPk(newMessage.id, {
      include: [
        { model: User, as: "sender", attributes: ["name", "avatar"] },
        { 
          model: Chat,
          include: [{ model: User, as: "users", attributes: ["id", "name", "email", "avatar"] }]
        },
      ],
    });

    // Update the latest message of the chat
    await Chat.update(
      { latestMessageId: newMessage.id },
      { where: { id: chatId } }
    );

    res.json(fullMessage);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

// @desc    Fetch all messages for a chat
// @route   GET /api/message/:chatId
// @access  Protected
exports.allMessages = async (req, res) => {
  try {
    const membership = await ChatMember.findOne({
      where: { chatId: req.params.chatId, userId: req.user.id },
      paranoid: false
    });
    
    if (!membership) {
        // If they are literally not tied to the chat at all
        return res.status(403).json({ message: "Not a member" });
    }
    
    let timeBounds = {
       [Op.gte]: membership.createdAt
    };
    if (membership.deletedAt) {
       timeBounds[Op.lte] = membership.deletedAt;
    }

    const messages = await Message.findAll({
      where: { 
        chatId: req.params.chatId,
        createdAt: timeBounds
      },
      include: [
        { model: User, as: "sender", attributes: ["name", "avatar", "email"] },
      ],
      order: [["createdAt", "ASC"]],
    });

    const filteredMessages = messages.filter(m => !m.deletedFor?.includes(req.user.id));
    res.json(filteredMessages);
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
      message.isDeleted = true;
      message.content = "This message was deleted.";
      await message.save();
      return res.json({ id: message.id, isDeleted: true, content: message.content, target: "everyone" });
    } else {
      const newDeletedFor = [...(message.deletedFor || []), req.user.id];
      message.deletedFor = newDeletedFor;
      await message.save();
      return res.json({ id: message.id, target: "me" });
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
     const message = await Message.findByPk(req.params.id);
     if (!message) return res.status(404).json({ message: "Message not found" });
     
     const reactions = { ...message.reactions } || {};
     Object.keys(reactions).forEach(e => {
       reactions[e] = reactions[e].filter(id => id !== req.user.id);
       if (reactions[e].length === 0) delete reactions[e];
     });
     
     if (emoji) {
       if (!reactions[emoji]) reactions[emoji] = [];
       reactions[emoji].push(req.user.id);
     }
     
     message.reactions = reactions;
     await message.save();
     
     res.json(message);
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

    if (message.isDeleted) {
       return res.status(400).json({ message: "Cannot edit a deleted message" });
    }

    message.content = content;
    message.isEdited = true;
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
     const messages = await Message.findAll({ where: { chatId: req.params.chatId } });
     
     const updates = messages.map(msg => {
        if (!msg.deletedFor?.includes(req.user.id)) {
            msg.deletedFor = [...(msg.deletedFor || []), req.user.id];
            return msg.save();
        }
        return Promise.resolve();
     });
     
     await Promise.all(updates);
     res.json({ message: "Chat cleared successfully" });
  } catch (error) {
     res.status(500).json({ message: "Failed to clear chat", error: error.message });
  }
};
