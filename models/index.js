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
const PlateRecognition = require('./PlateRecognition');
const Car = require('./Car');
const Violation = require('./Violation');
const RadarReading = require('./RadarReading');

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

// Plate Recognition associations
PlateRecognition.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });
User.hasMany(PlateRecognition, { foreignKey: 'processedBy', as: 'plateRecognitions' });

// Car associations
Car.belongsTo(PlateRecognition, { foreignKey: 'plateRecognitionId', as: 'plateRecognition' });
PlateRecognition.hasOne(Car, { foreignKey: 'plateRecognitionId', as: 'car' });

// Violation associations
Violation.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });
User.hasMany(Violation, { foreignKey: 'reviewedBy', as: 'reviewedViolations' });

Violation.belongsTo(Radar, { foreignKey: 'radarId', as: 'radar' });
Radar.hasMany(Violation, { foreignKey: 'radarId', as: 'violations' });

Violation.belongsTo(Car, { foreignKey: 'carId', as: 'car' });
Car.hasMany(Violation, { foreignKey: 'carId', as: 'violations' });

// RadarReading associations
RadarReading.belongsTo(Radar, { foreignKey: 'radarId', as: 'radar' });
Radar.hasMany(RadarReading, { foreignKey: 'radarId', as: 'readings' });

RadarReading.belongsTo(Fine, { foreignKey: 'fineId', as: 'fine' });
Fine.hasOne(RadarReading, { foreignKey: 'fineId', as: 'reading' });

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
  SystemMetric,
  PlateRecognition,
  Car,
  Violation,
  RadarReading
};
