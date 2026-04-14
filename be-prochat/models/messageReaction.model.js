const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const MessageReaction = sequelize.define("MessageReaction", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  emoji: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  reactedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  indexes: [
    {
       unique: true,
       fields: ["messageId", "userId", "emoji"],
    },
  ],
});

module.exports = MessageReaction;
