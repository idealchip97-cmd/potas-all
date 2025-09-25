const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Car = sequelize.define('Car', {
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
      len: [2, 20],
      is: /^[A-Z0-9-]+$/i, // Allow letters, numbers, and dashes
    },
    comment: 'License plate number of the vehicle'
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 20],
    },
    comment: 'Color of the vehicle'
  },
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 20],
    },
    comment: 'Type of vehicle (sedan, SUV, truck, etc.)'
  },
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
    comment: 'URL to access the vehicle image'
  },
  imagePath: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Local file path to the uploaded image',
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 100,
    },
    comment: 'AI confidence score for the detection (0-100)',
  },
  cameraInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Information about the camera that captured the image',
  },
  detectionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Identifier for the detection method used (e.g., strict_, regular_, traffic_)',
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the vehicle was detected'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Location where the vehicle was detected'
  },
  speed: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Detected speed of the vehicle (if available)'
  },
  direction: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Direction of travel (north, south, east, west)'
  },
  processingEngine: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'enhanced-vision',
    comment: 'AI engine used for processing (chatgpt-vision, tesseract, enhanced-vision)'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata about the detection'
  },
  plateRecognitionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'PlateRecognitions',
      key: 'id'
    },
    comment: 'ID of the associated plate recognition record'
  }
}, {
  tableName: 'cars',
  timestamps: true,
  indexes: [
    {
      fields: ['plateNumber']
    },
    {
      fields: ['color']
    },
    {
      fields: ['type']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['location']
    },
    {
      fields: ['processingEngine']
    }
  ]
});

module.exports = Car;
