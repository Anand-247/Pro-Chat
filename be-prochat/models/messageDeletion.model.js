const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const MessageDeletion = sequelize.define("MessageDeletion", {
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
       fields: ["messageId", "userId"],
    },
  ],
});

module.exports = MessageDeletion;
