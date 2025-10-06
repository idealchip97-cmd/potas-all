const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RadarReading = sequelize.define('RadarReading', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  radarId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'radars',
      key: 'id'
    },
    comment: 'ID of the radar that detected the speed'
  },
  speedDetected: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Speed detected in km/h'
  },
  speedLimit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    comment: 'Speed limit at the time of detection in km/h'
  },
  detectionTime: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Exact time when speed was detected'
  },
  isViolation: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this reading constitutes a speed violation'
  },
  fineId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'fines',
      key: 'id'
    },
    comment: 'Associated fine ID if violation resulted in a fine'
  },
  correlatedImages: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of correlated camera image URLs within 2-second window'
  },
  sourceIP: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'IP address of the UDP source'
  },
  rawData: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Original UDP message received'
  },
  processed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this reading has been processed for violations'
  }
}, {
  tableName: 'radar_readings',
  timestamps: true,
  indexes: [
    {
      fields: ['radarId']
    },
    {
      fields: ['detectionTime']
    },
    {
      fields: ['speedDetected']
    },
    {
      fields: ['isViolation']
    },
    {
      fields: ['processed']
    },
    {
      fields: ['fineId']
    },
    {
      fields: ['radarId', 'detectionTime']
    },
    {
      fields: ['detectionTime', 'isViolation']
    },
    {
      fields: ['speedDetected', 'detectionTime']
    }
  ]
});

module.exports = RadarReading;
