const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(60),
    allowNull: false,
    defaultValue: "User",
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  avatar: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
  },
  about: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: "Hey there! I am using Pro-Chat.",
  },
  publicKey: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastSeenAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  paranoid: true, // soft delete via deletedAt
});

module.exports = User;
