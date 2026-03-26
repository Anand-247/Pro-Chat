const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Reaction = sequelize.define("Reaction", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  emoji: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = Reaction;
