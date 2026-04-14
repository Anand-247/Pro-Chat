const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Call = sequelize.define("Call", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  callerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("voice", "video"),
    defaultValue: "voice",
  },
  status: {
    type: DataTypes.ENUM("missed", "completed", "rejected", "busy", "ongoing"),
    defaultValue: "ongoing",
  },
  duration: {
    type: DataTypes.INTEGER, // duration in seconds
    defaultValue: 0,
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = Call;
