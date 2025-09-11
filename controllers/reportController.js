const { Fine, Radar, User, sequelize } = require('../models');
const { Op } = require('sequelize');

const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
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

    // Get violations by hour (for traffic pattern analysis)
    const violationsByHour = await sequelize.query(`
      SELECT 
        HOUR(violationDateTime) as hour,
        COUNT(*) as violationCount
      FROM fines 
      ${startDate && endDate ? `WHERE violationDateTime BETWEEN '${startDate}' AND '${endDate}'` : ''}
      GROUP BY HOUR(violationDateTime)
      ORDER BY hour
    `, { type: sequelize.QueryTypes.SELECT });

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
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
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

module.exports = {
  getDashboardStats,
  getViolationTrends,
  getRadarPerformance
};
