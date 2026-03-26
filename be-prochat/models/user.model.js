const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "User",
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
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
  },
  bio: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "Hey there! I am using Pro-Chat.",
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastSeen: {
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
});

module.exports = User;
