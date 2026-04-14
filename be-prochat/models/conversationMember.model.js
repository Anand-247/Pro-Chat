const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const ConversationMember = sequelize.define("ConversationMember", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  role: {
    type: DataTypes.ENUM("owner", "admin", "member"),
    defaultValue: "member",
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  leftReason: {
    type: DataTypes.ENUM("self", "removed", "banned"),
    allowNull: true,
  },
  isMuted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  mutedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  nickname: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  lastReadAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  paranoid: true, // soft delete support
});

module.exports = ConversationMember;
