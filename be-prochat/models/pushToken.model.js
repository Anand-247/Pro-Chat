const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const PushToken = sequelize.define("PushToken", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  platform: {
    type: DataTypes.ENUM("ios", "android", "web"),
    allowNull: false,
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = PushToken;
