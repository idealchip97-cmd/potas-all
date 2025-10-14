const { Sequelize } = require('sequelize');
require('dotenv').config();

// MySQL-only configuration (SQLite disabled)
const sequelize = new Sequelize(
  process.env.DB_NAME || 'potassium_backend',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    timezone: '+03:00', // Local timezone
  }
);

module.exports = sequelize;
