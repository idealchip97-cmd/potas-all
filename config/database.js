const { Sequelize } = require('sequelize');
require('dotenv').config();

// Allow switching dialects for development convenience.
// If DB_DIALECT=sqlite, use a local SQLite file (default: dev.sqlite).
// Otherwise, default to MySQL using the configured environment variables.
let sequelize;

const DIALECT = (process.env.DB_DIALECT || 'mysql').toLowerCase();

if (DIALECT === 'sqlite') {
  const storage = process.env.SQLITE_STORAGE || 'dev.sqlite';
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  });
} else {
  sequelize = new Sequelize(
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
        idle: 10000
      },
      define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
      },
      timezone: '+03:00' // Your local timezone
    }
  );
}

module.exports = sequelize;
