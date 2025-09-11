const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReportData = sequelize.define('ReportData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reportId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'reports',
      key: 'id'
    },
    comment: 'Reference to the parent report'
  },
  dataType: {
    type: DataTypes.ENUM(
      'violation_summary',
      'radar_statistics',
      'financial_data',
      'performance_metrics',
      'trend_analysis',
      'comparative_data',
      'raw_data'
    ),
    allowNull: false,
    comment: 'Type of data stored in this record'
  },
  dataKey: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Key identifier for this data point (e.g., radar_id, date, metric_name)'
  },
  dataValue: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'JSON object containing the actual data values'
  },
  aggregationLevel: {
    type: DataTypes.ENUM('hourly', 'daily', 'weekly', 'monthly', 'yearly', 'total'),
    allowNull: false,
    comment: 'Level of data aggregation'
  },
  periodStart: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Start date/time for this data period'
  },
  periodEnd: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'End date/time for this data period'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata about this data point'
  }
}, {
  tableName: 'report_data',
  timestamps: true,
  indexes: [
    {
      fields: ['reportId']
    },
    {
      fields: ['dataType']
    },
    {
      fields: ['dataKey']
    },
    {
      fields: ['aggregationLevel']
    },
    {
      fields: ['periodStart', 'periodEnd']
    },
    {
      fields: ['reportId', 'dataType', 'dataKey'],
      unique: true
    }
  ]
});

module.exports = ReportData;
