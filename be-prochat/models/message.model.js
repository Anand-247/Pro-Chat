const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Message = sequelize.define("Message", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true, // Nullable if it's just a file
  },
  type: {
    type: DataTypes.ENUM("text", "image", "video", "document", "system"),
    defaultValue: "text",
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("sent", "delivered", "read"),
    defaultValue: "sent",
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  deletedFor: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
  },
  readBy: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
  },
  reactions: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  timestamps: true,
});

module.exports = Message;
