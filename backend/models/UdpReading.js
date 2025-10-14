const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UdpReading = sequelize.define('UdpReading', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  radarId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the radar that sent the data'
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
  sourceIP: {
    type: DataTypes.STRING(45), // Support IPv6
    allowNull: true,
    comment: 'IP address of the UDP source'
  },
  sourcePort: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Port number of the UDP source'
  },
  rawMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Original UDP message received'
  },
  messageFormat: {
    type: DataTypes.ENUM('text', 'json', 'binary', 'unknown'),
    allowNull: false,
    defaultValue: 'unknown',
    comment: 'Format of the received message'
  },
  hexData: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Hexadecimal representation of binary data'
  },
  processed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this reading has been processed'
  },
  fineCreated: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether a fine was created for this violation'
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
    comment: 'Array of correlated camera image URLs'
  },
  processingNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes about processing this reading'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if processing failed'
  }
}, {
  tableName: 'udp_readings',
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
      fields: ['fineCreated']
    },
    {
      fields: ['sourceIP']
    },
    {
      fields: ['messageFormat']
    },
    {
      fields: ['radarId', 'detectionTime']
    },
    {
      fields: ['detectionTime', 'isViolation']
    },
    {
      fields: ['speedDetected', 'detectionTime']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = UdpReading;
