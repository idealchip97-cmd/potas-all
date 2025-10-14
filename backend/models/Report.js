const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reportTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'report_types',
      key: 'id'
    },
    comment: 'Reference to the report type'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 200]
    },
    comment: 'Custom title for this specific report instance'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Optional description or notes for this report'
  },
  generatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who generated this report'
  },
  status: {
    type: DataTypes.ENUM('pending', 'generating', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending',
    comment: 'Current status of report generation'
  },
  parameters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'JSON object containing report parameters (date range, filters, etc.)'
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Path to generated report file (PDF, Excel, etc.)'
  },
  fileFormat: {
    type: DataTypes.ENUM('pdf', 'excel', 'csv', 'json'),
    defaultValue: 'pdf',
    comment: 'Format of the generated report file'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Size of generated file in bytes'
  },
  recordCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Number of records included in the report'
  },
  generationStartTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When report generation started'
  },
  generationEndTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When report generation completed'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if report generation failed'
  },
  isScheduled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this report was generated from a schedule'
  },
  scheduleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'report_schedules',
      key: 'id'
    },
    comment: 'Reference to schedule if this is a scheduled report'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this report file should be automatically deleted'
  }
}, {
  tableName: 'reports',
  timestamps: true,
  indexes: [
    {
      fields: ['reportTypeId']
    },
    {
      fields: ['generatedBy']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['isScheduled']
    },
    {
      fields: ['scheduleId']
    },
    {
      fields: ['expiresAt']
    }
  ]
});

module.exports = Report;
