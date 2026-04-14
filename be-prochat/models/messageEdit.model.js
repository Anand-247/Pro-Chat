const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const MessageEdit = sequelize.define("MessageEdit", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  oldContent: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  newContent: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  editedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
});

module.exports = MessageEdit;
