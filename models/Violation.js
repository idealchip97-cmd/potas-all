const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Violation = sequelize.define('Violation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  plateNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 20],
    },
    comment: 'License plate number of the violating vehicle'
  },
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
    comment: 'URL to access the violation evidence image'
  },
  originalFileName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Original filename of the uploaded image'
  },
  processingMethod: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Method used to process the violation (manual, automatic, ai-enhanced)'
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 100,
    },
    comment: 'AI confidence score for the violation detection (0-100)'
  },
  vehicleInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional information about the vehicle (color, type, etc.)'
  },
  cameraId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Identifier of the camera that captured the violation'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Location where the violation occurred'
  },
  speed: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Detected speed of the vehicle during violation'
  },
  speedLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Speed limit at the location of violation'
  },
  violationType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'speeding',
    validate: {
      isIn: [['speeding', 'red_light', 'illegal_parking', 'wrong_direction', 'unauthorized_access', 'other']]
    },
    comment: 'Type of traffic violation'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the violation occurred'
  },
  confirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the violation has been confirmed by an operator'
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'confirmed', 'dismissed', 'under_review', 'processed']]
    },
    comment: 'Current status of the violation'
  },
  fineAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Fine amount for the violation'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about the violation'
  },
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of the user who reviewed this violation'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the violation was reviewed'
  },
  radarId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'radars',
      key: 'id'
    },
    comment: 'ID of the radar that detected this violation'
  },
  carId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'cars',
      key: 'id'
    },
    comment: 'ID of the associated car record'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata about the violation'
  }
}, {
  tableName: 'violations',
  timestamps: true,
  indexes: [
    {
      fields: ['plateNumber']
    },
    {
      fields: ['confirmed']
    },
    {
      fields: ['status']
    },
    {
      fields: ['violationType']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['location']
    },
    {
      fields: ['radarId']
    },
    {
      fields: ['carId']
    },
    {
      fields: ['reviewedBy']
    }
  ]
});

module.exports = Violation;
