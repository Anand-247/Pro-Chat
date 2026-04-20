const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Set to true if you provide the CA certificate
      },
    },
    logging: false, // Set to console.log to see SQL queries
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL Connected via Sequelize...");
    
    // Load models and associations
    require("../models");
    
    // Sync models
    await sequelize.sync({ alter: true }); // Use { force: true } only for development if you want to drop tables
    console.log("Database synced.");
  } catch (err) {
    console.error("Unable to connect to the database:", err.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
