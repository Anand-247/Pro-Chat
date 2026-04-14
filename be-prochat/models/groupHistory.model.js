const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const GroupHistory = sequelize.define("GroupHistory", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  event: {
    type: DataTypes.ENUM(
      "created", "joined", "left", "removed", "banned", 
      "promoted", "demoted", "renamed", "description_changed", 
      "avatar_changed", "link_reset", "invite_accepted"
    ),
    allowNull: false,
  },
  meta: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  occurredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
});

module.exports = GroupHistory;
