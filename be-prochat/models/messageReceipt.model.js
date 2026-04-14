const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const MessageReceipt = sequelize.define("MessageReceipt", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
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

module.exports = MessageReceipt;
