const sequelize = require('../config/database');
const User = require('./User');
const Radar = require('./Radar');
const Fine = require('./Fine');

// Define associations
Fine.belongsTo(Radar, { foreignKey: 'radarId', as: 'radar' });
Radar.hasMany(Fine, { foreignKey: 'radarId', as: 'fines' });

Fine.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });
User.hasMany(Fine, { foreignKey: 'processedBy', as: 'processedFines' });

module.exports = {
  sequelize,
  User,
  Radar,
  Fine
};
