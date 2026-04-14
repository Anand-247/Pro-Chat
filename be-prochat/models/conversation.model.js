const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Conversation = sequelize.define("Conversation", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM("dm", "group"),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  avatarUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  inviteLink: {
    type: DataTypes.STRING(64),
    unique: true,
    allowNull: true,
  },
  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  latestMessageId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  isGroupChat: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.type === "group";
    },
  },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

module.exports = Conversation;
