const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const ChatMember = sequelize.define("ChatMember", {
  role: {
    type: DataTypes.ENUM("admin", "member"),
    defaultValue: "member",
  },
}, {
  timestamps: true, // joinedAt becomes createdAt
  paranoid: true, // soft delete via deletedAt
});

module.exports = ChatMember;
