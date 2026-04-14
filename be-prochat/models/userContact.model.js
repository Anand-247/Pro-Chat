const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const UserContact = sequelize.define("UserContact", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nickname: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  isBlocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  blockedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  addedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  indexes: [
    {
       unique: true,
       fields: ["ownerId", "contactId"],
    },
  ],
});

module.exports = UserContact;
