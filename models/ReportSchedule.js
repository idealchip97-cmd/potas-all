const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReportSchedule = sequelize.define('ReportSchedule', {
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
    comment: 'Type of report to generate on schedule'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 100]
    },
    comment: 'Name for this scheduled report'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the scheduled report'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who created this schedule'
  },
  frequency: {
    type: DataTypes.ENUM('hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
    allowNull: false,
    comment: 'How often to generate this report'
  },
  cronExpression: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Cron expression for custom scheduling'
  },
  parameters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Default parameters for scheduled report generation'
  },
  recipients: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'JSON array of email addresses to send report to'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this schedule is currently active'
  },
  nextRunTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this schedule should next run'
  },
  lastRunTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this schedule last ran'
  },
  lastRunStatus: {
    type: DataTypes.ENUM('success', 'failed', 'pending'),
    allowNull: true,
    comment: 'Status of the last scheduled run'
  },
  runCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of times this schedule has run'
  },
  maxRetries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    comment: 'Maximum number of retry attempts if generation fails'
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Current retry count for failed generations'
  }
}, {
  tableName: 'report_schedules',
  timestamps: true,
  indexes: [
    {
      fields: ['reportTypeId']
    },
    {
      fields: ['createdBy']
    },
    {
      fields: ['frequency']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['nextRunTime']
    },
    {
      fields: ['lastRunStatus']
    }
  ]
});

module.exports = ReportSchedule;
