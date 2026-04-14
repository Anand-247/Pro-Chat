const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const ChatDelete = sequelize.define("ChatDelete", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  deletedAt: {
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

module.exports = ChatDelete;
