const { Fine, Radar, User, ReportType, Report, ReportSchedule, ReportData, AuditLog, SystemMetric, sequelize } = require('../models');
const { Op } = require('sequelize');

const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('Dashboard stats requested with params:', { startDate, endDate });
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        violationDateTime: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      };
    }

    // Get basic statistics
    const totalRadars = await Radar.count();
    const activeRadars = await Radar.count({ where: { status: 'active' } });
    const totalFines = await Fine.count({ where: dateFilter });
    const pendingFines = await Fine.count({ 
      where: { ...dateFilter, status: 'pending' } 
    });

    // Get total fine amount
    const fineAmountResult = await Fine.findOne({
      where: dateFilter,
      attributes: [[sequelize.fn('SUM', sequelize.col('fineAmount')), 'totalAmount']]
    });

    // Get violations by radar
    const violationsByRadar = await Fine.findAll({
      where: dateFilter,
      attributes: [
        'radarId',
        [sequelize.fn('COUNT', sequelize.col('Fine.id')), 'violationCount']
      ],
      include: [{
        model: Radar,
        as: 'radar',
        attributes: ['name', 'location']
      }],
      group: ['radarId', 'radar.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('Fine.id')), 'DESC']]
    });

    // Get violations by hour (for traffic pattern analysis) - Using Sequelize to avoid MySQL version issues
    let violationsByHour = [];
    try {
      // Use Sequelize ORM instead of raw SQL to avoid MySQL system table issues
      const fines = await Fine.findAll({
        attributes: [
          'violationDateTime'
        ],
        where: dateFilter,
        raw: true
      });
      
      // Process the data in JavaScript to create hourly distribution
      const hourlyData = {};
      fines.forEach(fine => {
        const hour = new Date(fine.violationDateTime).getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + 1;
      });
      
      // Create array with all 24 hours
      violationsByHour = Array.from({length: 24}, (_, i) => ({
        hour: i,
        violationCount: hourlyData[i] || 0
      }));
      
    } catch (error) {
      console.warn('Hour-based query failed, using empty data:', error.message);
      // Fallback: Return empty hourly data
      violationsByHour = Array.from({length: 24}, (_, i) => ({
        hour: i,
        violationCount: 0
      }));
    }

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        overview: {
          totalRadars,
          activeRadars,
          totalFines,
          pendingFines,
          totalFineAmount: fineAmountResult?.totalAmount || 0
        },
        violationsByRadar,
        violationsByHour
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    console.error('Error stack:', error.stack);
    
    // Return a more user-friendly error response
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        sql: error.sql || 'No SQL query available'
      } : undefined
    });
  }
};

const getViolationTrends = async (req, res) => {
  try {
    const { period = 'daily', radarId, days = 30 } = req.query;
    
    let dateFormat;
    switch (period) {
      case 'hourly':
        dateFormat = '%Y-%m-%d %H:00:00';
        break;
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-%u';
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const whereClause = radarId ? `WHERE radarId = ${radarId}` : '';
    const dateLimit = `AND violationDateTime >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`;

    const trends = await sequelize.query(`
      SELECT 
        DATE_FORMAT(violationDateTime, '${dateFormat}') as period,
        COUNT(*) as violationCount,
        AVG(speedDetected) as avgSpeed,
        MAX(speedDetected) as maxSpeed,
        SUM(fineAmount) as totalFines
      FROM fines 
      ${whereClause} 
      ${whereClause ? dateLimit : `WHERE violationDateTime >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`}
      GROUP BY DATE_FORMAT(violationDateTime, '${dateFormat}')
      ORDER BY period
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      message: 'Violation trends retrieved successfully',
      data: { trends }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getRadarPerformance = async (req, res) => {
  try {
    const performance = await Radar.findAll({
      attributes: [
        'id',
        'name',
        'location',
        'status',
        'speedLimit'
      ],
      include: [{
        model: Fine,
        as: 'fines',
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('fines.id')), 'totalViolations'],
          [sequelize.fn('AVG', sequelize.col('speedDetected')), 'avgSpeed'],
          [sequelize.fn('MAX', sequelize.col('speedDetected')), 'maxSpeed'],
          [sequelize.fn('SUM', sequelize.col('fineAmount')), 'totalFineAmount']
        ],
        required: false
      }],
      group: ['Radar.id']
    });

    res.json({
      success: true,
      message: 'Radar performance retrieved successfully',
      data: { performance }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getSpeedAnalysis = async (req, res) => {
  try {
    const { radarId, startDate, endDate } = req.query;
    
    let whereClause = {};
    if (radarId) whereClause.radarId = radarId;
    if (startDate && endDate) {
      whereClause.violationDateTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Speed distribution analysis
    const speedDistribution = await sequelize.query(`
      SELECT 
        CASE 
          WHEN speedDetected BETWEEN 0 AND 30 THEN '0-30 km/h'
          WHEN speedDetected BETWEEN 31 AND 50 THEN '31-50 km/h'
          WHEN speedDetected BETWEEN 51 AND 70 THEN '51-70 km/h'
          WHEN speedDetected BETWEEN 71 AND 90 THEN '71-90 km/h'
          ELSE '90+ km/h'
        END as speedRange,
        COUNT(*) as violationCount,
        AVG(fineAmount) as avgFineAmount
      FROM fines 
      ${radarId ? `WHERE radarId = ${radarId}` : ''}
      ${startDate && endDate ? `${radarId ? 'AND' : 'WHERE'} violationDateTime BETWEEN '${startDate}' AND '${endDate}'` : ''}
      GROUP BY speedRange
      ORDER BY MIN(speedDetected)
    `, { type: sequelize.QueryTypes.SELECT });

    // Peak violation times
    const peakTimes = await sequelize.query(`
      SELECT 
        HOUR(violationDateTime) as hour,
        COUNT(*) as violationCount,
        AVG(speedDetected) as avgSpeed
      FROM fines 
      ${radarId ? `WHERE radarId = ${radarId}` : ''}
      ${startDate && endDate ? `${radarId ? 'AND' : 'WHERE'} violationDateTime BETWEEN '${startDate}' AND '${endDate}'` : ''}
      GROUP BY HOUR(violationDateTime)
      ORDER BY violationCount DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      message: 'Speed analysis retrieved successfully',
      data: {
        speedDistribution,
        peakTimes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getViolationsByLocation = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `WHERE f.violationDateTime BETWEEN '${startDate}' AND '${endDate}'`;
    }

    const locationStats = await sequelize.query(`
      SELECT 
        r.location,
        r.name as radarName,
        COUNT(f.id) as totalViolations,
        AVG(f.speedDetected) as avgSpeed,
        MAX(f.speedDetected) as maxSpeed,
        SUM(f.fineAmount) as totalFines,
        r.speedLimit
      FROM radars r
      LEFT JOIN fines f ON r.id = f.radarId
      ${dateFilter}
      GROUP BY r.id, r.location, r.name, r.speedLimit
      ORDER BY totalViolations DESC
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      message: 'Location-based violations retrieved successfully',
      data: { locationStats }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const monthlyData = await sequelize.query(`
      SELECT 
        MONTH(violationDateTime) as month,
        MONTHNAME(violationDateTime) as monthName,
        COUNT(*) as totalViolations,
        AVG(speedDetected) as avgSpeed,
        SUM(fineAmount) as totalFines,
        COUNT(DISTINCT radarId) as activeRadars
      FROM fines 
      WHERE YEAR(violationDateTime) = ${year}
      GROUP BY MONTH(violationDateTime), MONTHNAME(violationDateTime)
      ORDER BY month
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      message: 'Monthly report retrieved successfully',
      data: { 
        year: parseInt(year),
        monthlyData 
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getComplianceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `WHERE violationDateTime BETWEEN '${startDate}' AND '${endDate}'`;
    }

    // Calculate compliance metrics
    const complianceData = await sequelize.query(`
      SELECT 
        COUNT(*) as totalViolations,
        AVG(violationAmount) as avgExcessSpeed,
        COUNT(CASE WHEN violationAmount <= 10 THEN 1 END) as minorViolations,
        COUNT(CASE WHEN violationAmount BETWEEN 11 AND 20 THEN 1 END) as moderateViolations,
        COUNT(CASE WHEN violationAmount > 20 THEN 1 END) as severeViolations,
        SUM(fineAmount) as totalFinesIssued,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paidFines,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingFines
      FROM fines 
      ${dateFilter}
    `, { type: sequelize.QueryTypes.SELECT });

    const complianceRate = complianceData[0];
    complianceRate.compliancePercentage = (
      (complianceRate.minorViolations / complianceRate.totalViolations) * 100
    ).toFixed(2);
    complianceRate.paymentRate = (
      (complianceRate.paidFines / complianceRate.totalViolations) * 100
    ).toFixed(2);

    res.json({
      success: true,
      message: 'Compliance report retrieved successfully',
      data: { complianceData: complianceRate }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Report Type Management
const getReportTypes = async (req, res) => {
  try {
    const { category, accessLevel } = req.query;
    
    let whereClause = { isActive: true };
    if (category) whereClause.category = category;
    if (accessLevel) whereClause.accessLevel = { [Op.in]: [accessLevel, 'viewer'] };

    const reportTypes = await ReportType.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      message: 'Report types retrieved successfully',
      data: { reportTypes }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const createReportType = async (req, res) => {
  try {
    const reportType = await ReportType.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Report type created successfully',
      data: { reportType }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Report Generation and Management
const generateReport = async (req, res) => {
  try {
    const { reportTypeId, title, description, parameters } = req.body;
    const userId = req.user.id;

    const reportType = await ReportType.findByPk(reportTypeId);
    if (!reportType) {
      return res.status(404).json({
        success: false,
        message: 'Report type not found'
      });
    }

    const report = await Report.create({
      reportTypeId,
      title: title || `${reportType.name} - ${new Date().toISOString().split('T')[0]}`,
      description,
      generatedBy: userId,
      status: 'generating',
      parameters: parameters || {},
      generationStartTime: new Date()
    });

    // Simulate report generation (in real implementation, this would be async)
    setTimeout(async () => {
      try {
        const reportData = await generateReportData(report, reportType, parameters);
        
        await report.update({
          status: 'completed',
          filePath: `/reports/${report.id}_${reportType.name.replace(/\s+/g, '_')}.pdf`,
          fileFormat: 'pdf',
          fileSize: Math.floor(Math.random() * 5000000) + 1000000,
          recordCount: reportData.recordCount,
          generationEndTime: new Date()
        });

        // Store report data
        if (reportData.data && reportData.data.length > 0) {
          await ReportData.bulkCreate(reportData.data.map(item => ({
            reportId: report.id,
            ...item
          })));
        }
      } catch (error) {
        await report.update({
          status: 'failed',
          errorMessage: error.message,
          generationEndTime: new Date()
        });
      }
    }, 2000);

    res.status(201).json({
      success: true,
      message: 'Report generation started',
      data: { report }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getReports = async (req, res) => {
  try {
    const { status, reportTypeId, generatedBy, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (status) whereClause.status = status;
    if (reportTypeId) whereClause.reportTypeId = reportTypeId;
    if (generatedBy) whereClause.generatedBy = generatedBy;

    const { count, rows: reports } = await Report.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: ReportType,
          as: 'reportType',
          attributes: ['name', 'category', 'description']
        },
        {
          model: User,
          as: 'generator',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      message: 'Reports retrieved successfully',
      data: {
        reports,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByPk(id, {
      include: [
        {
          model: ReportType,
          as: 'reportType'
        },
        {
          model: User,
          as: 'generator',
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: ReportData,
          as: 'data'
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report retrieved successfully',
      data: { report }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Report Scheduling
const createReportSchedule = async (req, res) => {
  try {
    const schedule = await ReportSchedule.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Report schedule created successfully',
      data: { schedule }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getReportSchedules = async (req, res) => {
  try {
    const { isActive, frequency } = req.query;

    let whereClause = {};
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';
    if (frequency) whereClause.frequency = frequency;

    const schedules = await ReportSchedule.findAll({
      where: whereClause,
      include: [
        {
          model: ReportType,
          as: 'reportType',
          attributes: ['name', 'category']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      order: [['nextRunTime', 'ASC']]
    });

    res.json({
      success: true,
      message: 'Report schedules retrieved successfully',
      data: { schedules }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// System Metrics and Monitoring
const getSystemMetrics = async (req, res) => {
  try {
    const { metricType, entityType, entityId, startDate, endDate } = req.query;

    let whereClause = {};
    if (metricType) whereClause.metricType = metricType;
    if (entityType) whereClause.entityType = entityType;
    if (entityId) whereClause.entityId = entityId;
    if (startDate && endDate) {
      whereClause.timestamp = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const metrics = await SystemMetric.findAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: 1000
    });

    res.json({
      success: true,
      message: 'System metrics retrieved successfully',
      data: { metrics }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { userId, action, entityType, severity, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = action;
    if (entityType) whereClause.entityType = entityType;
    if (severity) whereClause.severity = severity;
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: {
        auditLogs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to generate report data
const generateReportData = async (report, reportType, parameters) => {
  const data = [];
  let recordCount = 0;

  switch (reportType.category) {
    case 'violation_summary':
      const violations = await Fine.findAll({
        include: [{ model: Radar, as: 'radar' }],
        where: parameters.dateRange ? {
          violationDateTime: {
            [Op.between]: [parameters.dateRange.start, parameters.dateRange.end]
          }
        } : {},
        limit: 1000
      });
      
      recordCount = violations.length;
      violations.forEach(violation => {
        data.push({
          dataType: 'violation_summary',
          dataKey: `violation_${violation.id}`,
          dataValue: {
            radarName: violation.radar.name,
            speed: violation.speedDetected,
            violationAmount: violation.violationAmount,
            fineAmount: violation.fineAmount,
            status: violation.status,
            date: violation.violationDateTime
          },
          aggregationLevel: 'daily',
          periodStart: violation.violationDateTime,
          periodEnd: violation.violationDateTime
        });
      });
      break;

    case 'radar_performance':
      const radars = await Radar.findAll({
        include: [{ model: Fine, as: 'fines' }]
      });
      
      recordCount = radars.length;
      radars.forEach(radar => {
        const uptime = 95 + Math.random() * 5; // Simulated uptime
        data.push({
          dataType: 'radar_statistics',
          dataKey: `radar_${radar.id}`,
          dataValue: {
            name: radar.name,
            location: radar.location,
            status: radar.status,
            uptime: uptime.toFixed(2),
            totalDetections: radar.fines.length,
            avgSpeed: radar.fines.reduce((sum, f) => sum + f.speedDetected, 0) / radar.fines.length || 0
          },
          aggregationLevel: 'total'
        });
      });
      break;

    default:
      recordCount = 0;
  }

  return { data, recordCount };
};

module.exports = {
  getDashboardStats,
  getViolationTrends,
  getRadarPerformance,
  getSpeedAnalysis,
  getViolationsByLocation,
  getMonthlyReport,
  getComplianceReport,
  getReportTypes,
  createReportType,
  generateReport,
  getReports,
  getReportById,
  createReportSchedule,
  getReportSchedules,
  getSystemMetrics,
  getAuditLogs
};
