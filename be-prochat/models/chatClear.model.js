const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const ChatClear = sequelize.define("ChatClear", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  clearedBefore: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  clearedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ["conversationId", "userId"],
    },
  ],
});

module.exports = ChatClear;
