const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReportType = sequelize.define('ReportType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 100]
    },
    comment: 'Report type name (e.g., Daily Violations, Monthly Summary)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Detailed description of what this report contains'
  },
  category: {
    type: DataTypes.ENUM(
      'violation_summary',
      'radar_performance', 
      'financial_report',
      'operational_analytics',
      'compliance_audit',
      'maintenance_schedule',
      'traffic_analysis',
      'custom_report'
    ),
    allowNull: false,
    comment: 'Category of the report for grouping and filtering'
  },
  templateConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'JSON configuration for report template (columns, filters, etc.)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this report type is currently available'
  },
  accessLevel: {
    type: DataTypes.ENUM('admin', 'operator', 'viewer'),
    defaultValue: 'viewer',
    comment: 'Minimum access level required to generate this report'
  },
  estimatedGenerationTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated time in seconds to generate this report'
  }
}, {
  tableName: 'report_types',
  timestamps: true,
  indexes: [
    {
      fields: ['category']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['accessLevel']
    }
  ]
});

module.exports = ReportType;
