const User = require("./user.model");
const Chat = require("./chat.model");
const Message = require("./message.model");
const ChatMember = require("./chatMember.model");

// ==== User & Chat Associations (Many-to-Many via ChatMember) ====
User.belongsToMany(Chat, { through: ChatMember, foreignKey: "userId" });
Chat.belongsToMany(User, { through: ChatMember, foreignKey: "chatId", as: "users" });

// ==== Admin for Group Chats ====
Chat.belongsTo(User, { as: "groupAdmin", foreignKey: "groupAdminId" });

// ==== User & Message Associations ====
User.hasMany(Message, { foreignKey: "senderId" });
Message.belongsTo(User, { as: "sender", foreignKey: "senderId" });

// ==== Chat & Message Associations ====
Chat.hasMany(Message, { foreignKey: "chatId" });
Message.belongsTo(Chat, { foreignKey: "chatId" });

// Chat's latest message
Chat.belongsTo(Message, { as: "latestMessage", foreignKey: "latestMessageId" });

// ==== Reaction Associations Removed (migrated to JSONB column) ====

module.exports = {
  User,
  Chat,
  Message,
  ChatMember,
};
