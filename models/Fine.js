const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Fine = sequelize.define('Fine', {
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
    }
  },
  vehiclePlate: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Vehicle license plate number if detected'
  },
  speedDetected: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Speed detected in km/h'
  },
  speedLimit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Speed limit at the time of violation in km/h'
  },
  violationAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Amount of speed over the limit in km/h'
  },
  fineAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Fine amount in currency'
  },
  violationDateTime: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date and time when violation occurred'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processed', 'paid', 'cancelled'),
    defaultValue: 'pending'
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to violation image if available'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'fines',
  timestamps: true,
  indexes: [
    {
      fields: ['radarId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['violationDateTime']
    },
    {
      fields: ['speedDetected']
    },
    {
      fields: ['vehiclePlate']
    },
    {
      fields: ['processedBy']
    },
    {
      fields: ['processedAt']
    },
    {
      fields: ['radarId', 'violationDateTime']
    },
    {
      fields: ['status', 'violationDateTime']
    },
    {
      fields: ['speedDetected', 'violationDateTime']
    }
  ]
});

module.exports = Fine;
