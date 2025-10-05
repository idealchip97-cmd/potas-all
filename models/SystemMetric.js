const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SystemMetric = sequelize.define('SystemMetric', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  metricType: {
    type: DataTypes.ENUM(
      'radar_uptime',
      'detection_accuracy',
      'system_performance',
      'data_processing_time',
      'error_rate',
      'network_latency',
      'storage_usage',
      'api_response_time'
    ),
    allowNull: false,
    comment: 'Type of metric being recorded'
  },
  entityType: {
    type: DataTypes.ENUM('system', 'radar', 'user', 'api_endpoint'),
    allowNull: false,
    comment: 'Type of entity this metric relates to'
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the specific entity (radar ID, user ID, etc.)'
  },
  metricValue: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    comment: 'Numeric value of the metric'
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Unit of measurement (ms, %, MB, etc.)'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When this metric was recorded'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context or details about the metric'
  }
}, {
  tableName: 'system_metrics',
  timestamps: true,
  indexes: [
    {
      fields: ['metricType']
    },
    {
      fields: ['entityType', 'entityId']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['metricType', 'timestamp']
    },
    {
      fields: ['entityType', 'entityId', 'timestamp']
    }
  ]
});

module.exports = SystemMetric;
