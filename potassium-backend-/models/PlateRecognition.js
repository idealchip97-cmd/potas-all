const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlateRecognition = sequelize.define('PlateRecognition', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Original filename of the uploaded image'
    },
    filepath: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Server path to the stored image file'
    },
    plateNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Recognized license plate number'
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'OCR confidence score (0-100)'
    },
    status: {
      type: DataTypes.ENUM('processing', 'success', 'failed'),
      allowNull: false,
      defaultValue: 'processing',
      comment: 'Processing status of the recognition'
    },
    processedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'ID of the user who processed this image'
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Public URL to access the image'
    },
    ocrEngine: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'tesseract',
      comment: 'OCR engine used for recognition'
    },
    processingTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Processing time in milliseconds'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if processing failed'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata about the recognition process'
    },
    detectionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Identifier for the detection method used'
    },
    cameraInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Information about the camera that captured the image'
    },
    processingMethod: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'enhanced-vision',
      comment: 'Method used for processing (chatgpt-vision, tesseract, enhanced-vision)'
    },
    vehicleColor: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Detected color of the vehicle'
    },
    vehicleType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Detected type of vehicle'
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Location where the image was captured'
    },
    allResults: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Results from all AI engines used'
    },
    eventId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Event ID for new processing system (links to 3-photo folders)'
    }
  }, {
    tableName: 'plate_recognitions',
    timestamps: true,
    indexes: [
      {
        fields: ['plateNumber']
      },
      {
        fields: ['status']
      },
      {
        fields: ['processedBy']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

module.exports = PlateRecognition;
