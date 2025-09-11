const sequelize = require('../config/database');
const User = require('./User');
const Radar = require('./Radar');
const Fine = require('./Fine');
const ReportType = require('./ReportType');
const Report = require('./Report');
const ReportSchedule = require('./ReportSchedule');
const ReportData = require('./ReportData');
const AuditLog = require('./AuditLog');
const SystemMetric = require('./SystemMetric');

// Define associations

// Fine associations
Fine.belongsTo(Radar, { foreignKey: 'radarId', as: 'radar' });
Radar.hasMany(Fine, { foreignKey: 'radarId', as: 'fines' });

Fine.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });
User.hasMany(Fine, { foreignKey: 'processedBy', as: 'processedFines' });

// Report associations
Report.belongsTo(ReportType, { foreignKey: 'reportTypeId', as: 'reportType' });
ReportType.hasMany(Report, { foreignKey: 'reportTypeId', as: 'reports' });

Report.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });
User.hasMany(Report, { foreignKey: 'generatedBy', as: 'generatedReports' });

Report.belongsTo(ReportSchedule, { foreignKey: 'scheduleId', as: 'schedule' });
ReportSchedule.hasMany(Report, { foreignKey: 'scheduleId', as: 'generatedReports' });

// Report Schedule associations
ReportSchedule.belongsTo(ReportType, { foreignKey: 'reportTypeId', as: 'reportType' });
ReportType.hasMany(ReportSchedule, { foreignKey: 'reportTypeId', as: 'schedules' });

ReportSchedule.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(ReportSchedule, { foreignKey: 'createdBy', as: 'createdSchedules' });

// Report Data associations
ReportData.belongsTo(Report, { foreignKey: 'reportId', as: 'report' });
Report.hasMany(ReportData, { foreignKey: 'reportId', as: 'data' });

// Audit Log associations
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

module.exports = {
  sequelize,
  User,
  Radar,
  Fine,
  ReportType,
  Report,
  ReportSchedule,
  ReportData,
  AuditLog,
  SystemMetric
};
