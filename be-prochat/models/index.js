const User = require("./user.model");
const Conversation = require("./conversation.model");
const ConversationMember = require("./conversationMember.model");
const Message = require("./message.model");
const MessageReceipt = require("./messageReceipt.model");
const MessageDeletion = require("./messageDeletion.model");
const MessageReaction = require("./messageReaction.model");
const MessageEdit = require("./messageEdit.model");
const GroupHistory = require("./groupHistory.model");
const ChatClear = require("./chatClear.model");
const ChatDelete = require("./chatDelete.model");
const UserContact = require("./userContact.model");
const PushToken = require("./pushToken.model");
const Call = require("./call.model");

// ==== User & Conversation (Many-to-Many via ConversationMember) ====

User.belongsToMany(Conversation, { through: ConversationMember, foreignKey: "userId" });
Conversation.belongsToMany(User, { through: ConversationMember, foreignKey: "conversationId", as: "users" });

// ==== Admin / Creator ====
Conversation.belongsTo(User, { as: "creator", foreignKey: "createdBy" });
ConversationMember.belongsTo(User, { as: "remover", foreignKey: "removedBy" });

// ==== Messages ====
Conversation.hasMany(Message, { foreignKey: "conversationId" });
Message.belongsTo(Conversation, { as: "chat", foreignKey: "conversationId" });

User.hasMany(Message, { foreignKey: "senderId" });
Message.belongsTo(User, { as: "sender", foreignKey: "senderId" });

// Message Reply & Forward
Message.belongsTo(Message, { as: "replyTo", foreignKey: "replyToId" });
Message.belongsTo(Message, { as: "forwardedFrom", foreignKey: "forwardedFromId" });

// ==== Message Tracking (Receipts, Deletions, Reactions, Edits) ====
Message.hasMany(MessageReceipt, { foreignKey: "messageId" });
MessageReceipt.belongsTo(Message, { foreignKey: "messageId" });
User.hasMany(MessageReceipt, { foreignKey: "userId" });
MessageReceipt.belongsTo(User, { foreignKey: "userId" });

Message.hasMany(MessageDeletion, { foreignKey: "messageId" });
MessageDeletion.belongsTo(Message, { foreignKey: "messageId" });
User.hasMany(MessageDeletion, { foreignKey: "userId" });
MessageDeletion.belongsTo(User, { foreignKey: "userId" });

Message.hasMany(MessageReaction, { foreignKey: "messageId" });
MessageReaction.belongsTo(Message, { foreignKey: "messageId" });
User.hasMany(MessageReaction, { foreignKey: "userId" });
MessageReaction.belongsTo(User, { foreignKey: "userId" });

Message.hasMany(MessageEdit, { foreignKey: "messageId" });
MessageEdit.belongsTo(Message, { foreignKey: "messageId" });

// ==== Group History ====
Conversation.hasMany(GroupHistory, { foreignKey: "conversationId" });
GroupHistory.belongsTo(Conversation, { foreignKey: "conversationId" });
User.hasMany(GroupHistory, { as: "actorHistory", foreignKey: "actorId" });
GroupHistory.belongsTo(User, { as: "actor", foreignKey: "actorId" });
User.hasMany(GroupHistory, { as: "targetHistory", foreignKey: "targetUserId" });
GroupHistory.belongsTo(User, { as: "targetUser", foreignKey: "targetUserId" });

// ==== Chat Visibility (Clear/Delete) ====
User.hasMany(ChatClear, { foreignKey: "userId" });
ChatClear.belongsTo(User, { foreignKey: "userId" });
Conversation.hasMany(ChatClear, { foreignKey: "conversationId" });
ChatClear.belongsTo(Conversation, { foreignKey: "conversationId" });

User.hasMany(ChatDelete, { foreignKey: "userId" });
ChatDelete.belongsTo(User, { foreignKey: "userId" });
Conversation.hasMany(ChatDelete, { foreignKey: "conversationId" });
ChatDelete.belongsTo(Conversation, { foreignKey: "conversationId" });

// ==== Contacts & Blocking ====
User.hasMany(UserContact, { as: "contacts", foreignKey: "ownerId" });
UserContact.belongsTo(User, { as: "owner", foreignKey: "ownerId" });
User.hasMany(UserContact, { as: "contactOf", foreignKey: "contactId" });
UserContact.belongsTo(User, { as: "contact", foreignKey: "contactId" });

// ==== Push Tokens ====
User.hasMany(PushToken, { foreignKey: "userId" });
PushToken.belongsTo(User, { foreignKey: "userId" });

// ==== Calls ====
User.hasMany(Call, { as: "callerHistory", foreignKey: "callerId" });
Call.belongsTo(User, { as: "caller", foreignKey: "callerId" });
User.hasMany(Call, { as: "receiverHistory", foreignKey: "receiverId" });
Call.belongsTo(User, { as: "receiver", foreignKey: "receiverId" });

// ==== Latest Message Shorthand ====

Conversation.belongsTo(Message, { as: "latestMessage", foreignKey: "latestMessageId" });

module.exports = {
  User,
  Conversation,
  ConversationMember,
  Message,
  MessageReceipt,
  MessageDeletion,
  MessageReaction,
  MessageEdit,
  GroupHistory,
  ChatClear,
  ChatDelete,
  UserContact,
  PushToken,
  Call,
};
