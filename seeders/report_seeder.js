const { ReportType, Report, ReportSchedule, ReportData, AuditLog, SystemMetric, User } = require('../models');

const seedReportingData = async () => {
  try {
    console.log('Seeding reporting data...');

    // Create comprehensive report types
    const reportTypes = await ReportType.bulkCreate([
      {
        name: 'Daily Violation Summary',
        description: 'Summary of all violations detected in a single day',
        category: 'violation_summary',
        templateConfig: {
          columns: ['time', 'radar', 'speed', 'violation_amount', 'status'],
          groupBy: 'hour',
          charts: ['timeline', 'radar_distribution']
        },
        accessLevel: 'viewer',
        estimatedGenerationTime: 30
      },
      {
        name: 'Weekly Traffic Analysis',
        description: 'Comprehensive weekly traffic patterns and violations',
        category: 'traffic_analysis',
        templateConfig: {
          columns: ['day', 'total_violations', 'avg_speed', 'peak_hours'],
          groupBy: 'day',
          charts: ['trend_line', 'heatmap']
        },
        accessLevel: 'operator',
        estimatedGenerationTime: 60
      },
      {
        name: 'Monthly Financial Report',
        description: 'Monthly revenue from fines and financial analytics',
        category: 'financial_report',
        templateConfig: {
          columns: ['date', 'total_fines', 'collected_amount', 'pending_amount'],
          groupBy: 'week',
          charts: ['revenue_trend', 'collection_rate']
        },
        accessLevel: 'admin',
        estimatedGenerationTime: 90
      },
      {
        name: 'Radar Performance Report',
        description: 'Individual radar performance metrics and statistics',
        category: 'radar_performance',
        templateConfig: {
          columns: ['radar_name', 'uptime', 'detections', 'accuracy', 'maintenance_due'],
          groupBy: 'radar',
          charts: ['performance_matrix', 'uptime_chart']
        },
        accessLevel: 'operator',
        estimatedGenerationTime: 45
      },
      {
        name: 'Compliance Audit Report',
        description: 'Regulatory compliance and audit trail report',
        category: 'compliance_audit',
        templateConfig: {
          columns: ['date', 'action', 'user', 'entity', 'compliance_status'],
          groupBy: 'date',
          charts: ['audit_timeline', 'compliance_score']
        },
        accessLevel: 'admin',
        estimatedGenerationTime: 120
      },
      {
        name: 'Maintenance Schedule Report',
        description: 'Upcoming and overdue maintenance activities',
        category: 'maintenance_schedule',
        templateConfig: {
          columns: ['radar', 'last_maintenance', 'next_due', 'status', 'priority'],
          groupBy: 'priority',
          charts: ['maintenance_calendar', 'priority_distribution']
        },
        accessLevel: 'operator',
        estimatedGenerationTime: 20
      },
      {
        name: 'Operational Analytics Dashboard',
        description: 'Real-time operational metrics and KPIs',
        category: 'operational_analytics',
        templateConfig: {
          columns: ['metric', 'current_value', 'target', 'trend', 'alert_level'],
          groupBy: 'category',
          charts: ['kpi_dashboard', 'trend_analysis']
        },
        accessLevel: 'viewer',
        estimatedGenerationTime: 15
      },
      {
        name: 'Custom Violation Analysis',
        description: 'Customizable report for specific violation patterns',
        category: 'custom_report',
        templateConfig: {
          columns: ['configurable'],
          groupBy: 'configurable',
          charts: ['configurable']
        },
        accessLevel: 'admin',
        estimatedGenerationTime: 180
      }
    ]);

    console.log('Report types created successfully');

    // Get users for report generation
    const users = await User.findAll();
    const adminUser = users.find(u => u.role === 'admin');
    const operatorUser = users.find(u => u.role === 'operator');

    // Create sample reports
    const reports = await Report.bulkCreate([
      {
        reportTypeId: reportTypes[0].id,
        title: 'Daily Violations - Today',
        description: 'Automated daily report for current date',
        generatedBy: operatorUser.id,
        status: 'completed',
        parameters: {
          date: new Date().toISOString().split('T')[0],
          includeImages: true,
          format: 'detailed'
        },
        filePath: '/reports/daily_violations_' + new Date().toISOString().split('T')[0] + '.pdf',
        fileFormat: 'pdf',
        fileSize: 2048576,
        recordCount: 45,
        generationStartTime: new Date(Date.now() - 300000),
        generationEndTime: new Date(Date.now() - 270000),
        isScheduled: true,
        scheduleId: 1
      },
      {
        reportTypeId: reportTypes[1].id,
        title: 'Weekly Traffic Analysis - Current Week',
        description: 'Weekly traffic patterns and violation trends',
        generatedBy: adminUser.id,
        status: 'completed',
        parameters: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          includeComparisons: true
        },
        filePath: '/reports/weekly_traffic_' + new Date().toISOString().split('T')[0] + '.xlsx',
        fileFormat: 'excel',
        fileSize: 5242880,
        recordCount: 312,
        generationStartTime: new Date(Date.now() - 600000),
        generationEndTime: new Date(Date.now() - 540000),
        isScheduled: false
      },
      {
        reportTypeId: reportTypes[2].id,
        title: 'Monthly Financial Summary - Previous Month',
        description: 'Complete financial analysis for the previous month',
        generatedBy: adminUser.id,
        status: 'generating',
        parameters: {
          month: new Date().getMonth(),
          year: new Date().getFullYear(),
          includePredictions: true
        },
        generationStartTime: new Date(Date.now() - 60000)
      }
    ]);

    console.log('Sample reports created successfully');

    // Create report schedules
    const schedules = await ReportSchedule.bulkCreate([
      {
        reportTypeId: reportTypes[0].id,
        name: 'Daily Violation Summary - Automated',
        description: 'Automatically generated daily violation summary',
        createdBy: adminUser.id,
        frequency: 'daily',
        cronExpression: '0 8 * * *',
        parameters: {
          includeImages: true,
          emailNotification: true
        },
        recipients: ['admin@potasfactory.com', 'operator1@potasfactory.com'],
        isActive: true,
        nextRunTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastRunTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        lastRunStatus: 'success',
        runCount: 30
      },
      {
        reportTypeId: reportTypes[1].id,
        name: 'Weekly Traffic Analysis - Automated',
        description: 'Weekly traffic analysis sent every Monday',
        createdBy: adminUser.id,
        frequency: 'weekly',
        cronExpression: '0 9 * * 1',
        parameters: {
          includeComparisons: true,
          detailedCharts: true
        },
        recipients: ['admin@potasfactory.com'],
        isActive: true,
        nextRunTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastRunTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastRunStatus: 'success',
        runCount: 4
      },
      {
        reportTypeId: reportTypes[2].id,
        name: 'Monthly Financial Report - Automated',
        description: 'Monthly financial summary on first day of month',
        createdBy: adminUser.id,
        frequency: 'monthly',
        cronExpression: '0 10 1 * *',
        parameters: {
          includePredictions: true,
          detailedBreakdown: true
        },
        recipients: ['admin@potasfactory.com', 'finance@potasfactory.com'],
        isActive: true,
        nextRunTime: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1, 10, 0, 0),
        lastRunTime: new Date(new Date().getFullYear(), new Date().getMonth(), 1, 10, 0, 0),
        lastRunStatus: 'success',
        runCount: 6
      }
    ]);

    console.log('Report schedules created successfully');

    // Create sample audit logs
    const auditLogs = [];
    const actions = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT'];
    const entities = ['User', 'Radar', 'Fine', 'Report', 'ReportSchedule'];
    const severities = ['low', 'medium', 'high', 'critical'];

    for (let i = 0; i < 200; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const entity = entities[Math.floor(Math.random() * entities.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      
      auditLogs.push({
        userId: user.id,
        action,
        entityType: entity,
        entityId: Math.floor(Math.random() * 100) + 1,
        oldValues: action === 'UPDATE' ? { status: 'pending' } : null,
        newValues: action === 'UPDATE' ? { status: 'processed' } : null,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `sess_${Math.random().toString(36).substr(2, 9)}`,
        severity,
        success: Math.random() > 0.05,
        errorMessage: Math.random() > 0.95 ? 'Network timeout' : null,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }

    await AuditLog.bulkCreate(auditLogs);
    console.log('Audit logs created successfully');

    // Create system metrics
    const systemMetrics = [];
    const metricTypes = ['radar_uptime', 'detection_accuracy', 'system_performance', 'api_response_time'];
    const entityTypes = ['system', 'radar', 'api_endpoint'];

    for (let i = 0; i < 500; i++) {
      const metricType = metricTypes[Math.floor(Math.random() * metricTypes.length)];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
      
      let metricValue, unit;
      switch (metricType) {
        case 'radar_uptime':
          metricValue = 95 + Math.random() * 5;
          unit = '%';
          break;
        case 'detection_accuracy':
          metricValue = 92 + Math.random() * 8;
          unit = '%';
          break;
        case 'system_performance':
          metricValue = Math.random() * 100;
          unit = '%';
          break;
        case 'api_response_time':
          metricValue = 50 + Math.random() * 200;
          unit = 'ms';
          break;
      }

      systemMetrics.push({
        metricType,
        entityType,
        entityId: entityType === 'radar' ? Math.floor(Math.random() * 8) + 1 : null,
        metricValue,
        unit,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        metadata: {
          source: 'automated_monitoring',
          threshold: metricType.includes('uptime') || metricType.includes('accuracy') ? 95 : null
        }
      });
    }

    await SystemMetric.bulkCreate(systemMetrics);
    console.log('System metrics created successfully');

    console.log('Reporting data seeded successfully!');

  } catch (error) {
    console.error('Error seeding reporting data:', error);
    throw error;
  }
};

module.exports = seedReportingData;
