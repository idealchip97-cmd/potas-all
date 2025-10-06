const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who performed the action (null for system actions)'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Action performed (CREATE, UPDATE, DELETE, LOGIN, etc.)'
  },
  entityType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type of entity affected (User, Radar, Fine, Report, etc.)'
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the affected entity'
  },
  oldValues: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Previous values before the change'
  },
  newValues: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'New values after the change'
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'IP address from which the action was performed'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent string from the request'
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Session ID for tracking user sessions'
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'low',
    comment: 'Severity level of the action for security monitoring'
  },
  success: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether the action was successful'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if the action failed'
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['action']
    },
    {
      fields: ['entityType']
    },
    {
      fields: ['entityId']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['severity']
    },
    {
      fields: ['success']
    },
    {
      fields: ['userId', 'createdAt']
    }
  ]
});

module.exports = AuditLog;
