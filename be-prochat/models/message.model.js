const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Message = sequelize.define("Message", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM(
      "text", "image", "video", "audio", "document", 
      "sticker", "location", "contact", "poll", "system"
    ),
    defaultValue: "text",
  },
  mediaUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  mediaMime: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  mediaSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  mediaMeta: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  replyToId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  forwardedFromId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sentAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  deletedAt: {
    type: DataTypes.DATE, // delete for everyone
    allowNull: true,
  },
  encryptedBody: {
    type: DataTypes.BLOB,
    allowNull: true,
  },
  iv: {
    type: DataTypes.BLOB,
    allowNull: true,
  },
  chatId: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.conversationId;
    },
  },
  isDeleted: {
    type: DataTypes.VIRTUAL,
    get() {
       return this.deletedAt !== null;
    },
  },
  readBy: {
    type: DataTypes.VIRTUAL,
    get() {
       if (!this.MessageReceipts) return [];
       return this.MessageReceipts
         .filter(r => r.readAt !== null)
         .map(r => r.userId);
    },
  },
  status: {
    type: DataTypes.VIRTUAL,
    get() {
       if (this.deletedAt) return "sent"; // Or whatever matches UI expectations for deleted
       if (!this.MessageReceipts || this.MessageReceipts.length === 0) return "sent";
       const allRead = this.MessageReceipts.every(r => r.readAt !== null);
       const anyDelivered = this.MessageReceipts.some(r => r.deliveredAt !== null);
       if (allRead) return "read";
       if (anyDelivered) return "delivered";
       return "sent";
    },
  },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

module.exports = Message;
