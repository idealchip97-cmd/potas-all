const { Sequelize } = require('sequelize');
const { getDatabaseConfig, SYSTEM_CONSTANTS } = require('./systemConstants');

// Use centralized database configuration
const dbConfig = getDatabaseConfig();

const sequelize = new Sequelize(
  dbConfig.DATABASE,
  dbConfig.USERNAME,
  dbConfig.PASSWORD,
  {
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    dialect: 'mysql',
    logging: SYSTEM_CONSTANTS.SERVER.API.ENVIRONMENT === 'development' ? console.log : false,
    pool: {
      max: dbConfig.POOL.MAX,
      min: dbConfig.POOL.MIN,
      acquire: dbConfig.POOL.ACQUIRE,
      idle: dbConfig.POOL.IDLE,
    },
    define: {
      charset: dbConfig.CHARSET,
      collate: dbConfig.COLLATE,
    },
    timezone: dbConfig.TIMEZONE,
  }
);

module.exports = sequelize;
