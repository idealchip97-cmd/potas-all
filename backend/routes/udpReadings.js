const express = require('express');
const { Op } = require('sequelize');
const { UdpReading, Radar, Fine } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all UDP readings with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      radarId,
      isViolation,
      processed,
      messageFormat,
      startDate,
      endDate,
      minSpeed,
      maxSpeed,
      sourceIP
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (radarId) where.radarId = radarId;
    if (isViolation !== undefined) where.isViolation = isViolation === 'true';
    if (processed !== undefined) where.processed = processed === 'true';
    if (messageFormat) where.messageFormat = messageFormat;
    if (sourceIP) where.sourceIP = sourceIP;
    if (minSpeed) where.speedDetected = { [Op.gte]: parseInt(minSpeed) };
    if (maxSpeed) {
      where.speedDetected = where.speedDetected 
        ? { ...where.speedDetected, [Op.lte]: parseInt(maxSpeed) }
        : { [Op.lte]: parseInt(maxSpeed) };
    }
    if (startDate || endDate) {
      where.detectionTime = {};
      if (startDate) where.detectionTime[Op.gte] = new Date(startDate);
      if (endDate) where.detectionTime[Op.lte] = new Date(endDate);
    }

    const { count, rows } = await UdpReading.findAndCountAll({
      where,
      include: [
        {
          model: Radar,
          as: 'radar',
          attributes: ['id', 'name', 'location', 'status']
        },
        {
          model: Fine,
          as: 'fine',
          attributes: ['id', 'fineAmount', 'status'],
          required: false
        }
      ],
      order: [['detectionTime', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching UDP readings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch UDP readings',
      error: error.message
    });
  }
});

// Get live UDP readings (last 100 readings)
router.get('/live', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const readings = await UdpReading.findAll({
      include: [
        {
          model: Radar,
          as: 'radar',
          attributes: ['id', 'name', 'location', 'status']
        },
        {
          model: Fine,
          as: 'fine',
          attributes: ['id', 'fineAmount', 'status'],
          required: false
        }
      ],
      order: [['detectionTime', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: readings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching live UDP readings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch live UDP readings',
      error: error.message
    });
  }
});

// Get UDP reading by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const reading = await UdpReading.findByPk(id, {
      include: [
        {
          model: Radar,
          as: 'radar',
          attributes: ['id', 'name', 'location', 'status', 'speedLimit']
        },
        {
          model: Fine,
          as: 'fine',
          required: false
        }
      ]
    });

    if (!reading) {
      return res.status(404).json({
        success: false,
        message: 'UDP reading not found'
      });
    }

    res.json({
      success: true,
      data: reading
    });
  } catch (error) {
    console.error('Error fetching UDP reading:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch UDP reading',
      error: error.message
    });
  }
});

// Get UDP readings statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate, radarId } = req.query;
    const where = {};

    if (radarId) where.radarId = radarId;
    if (startDate || endDate) {
      where.detectionTime = {};
      if (startDate) where.detectionTime[Op.gte] = new Date(startDate);
      if (endDate) where.detectionTime[Op.lte] = new Date(endDate);
    }

    const [
      totalReadings,
      violationReadings,
      processedReadings,
      finesCreated,
      avgSpeed,
      maxSpeed,
      minSpeed
    ] = await Promise.all([
      UdpReading.count({ where }),
      UdpReading.count({ where: { ...where, isViolation: true } }),
      UdpReading.count({ where: { ...where, processed: true } }),
      UdpReading.count({ where: { ...where, fineCreated: true } }),
      UdpReading.findOne({
        where,
        attributes: [[UdpReading.sequelize.fn('AVG', UdpReading.sequelize.col('speedDetected')), 'avgSpeed']]
      }),
      UdpReading.max('speedDetected', { where }),
      UdpReading.min('speedDetected', { where })
    ]);

    // Get readings by message format
    const formatStats = await UdpReading.findAll({
      where,
      attributes: [
        'messageFormat',
        [UdpReading.sequelize.fn('COUNT', UdpReading.sequelize.col('id')), 'count']
      ],
      group: ['messageFormat']
    });

    // Get readings by radar
    const radarStats = await UdpReading.findAll({
      where,
      attributes: [
        'radarId',
        [UdpReading.sequelize.fn('COUNT', UdpReading.sequelize.col('UdpReading.id')), 'count']
      ],
      include: [
        {
          model: Radar,
          as: 'radar',
          attributes: ['name', 'location']
        }
      ],
      group: ['radarId', 'radar.id']
    });

    res.json({
      success: true,
      data: {
        totalReadings,
        violationReadings,
        processedReadings,
        finesCreated,
        complianceRate: totalReadings > 0 ? ((totalReadings - violationReadings) / totalReadings * 100).toFixed(2) : 0,
        averageSpeed: avgSpeed ? parseFloat(avgSpeed.dataValues.avgSpeed).toFixed(2) : 0,
        maxSpeed: maxSpeed || 0,
        minSpeed: minSpeed || 0,
        formatDistribution: formatStats.map(stat => ({
          format: stat.messageFormat,
          count: parseInt(stat.dataValues.count)
        })),
        radarDistribution: radarStats.map(stat => ({
          radarId: stat.radarId,
          radarName: stat.radar ? stat.radar.name : `Radar ${stat.radarId}`,
          location: stat.radar ? stat.radar.location : 'Unknown',
          count: parseInt(stat.dataValues.count)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching UDP readings statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Get recent violations (last 24 hours)
router.get('/violations/recent', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const violations = await UdpReading.findAll({
      where: {
        isViolation: true,
        detectionTime: {
          [Op.gte]: yesterday
        }
      },
      include: [
        {
          model: Radar,
          as: 'radar',
          attributes: ['id', 'name', 'location']
        },
        {
          model: Fine,
          as: 'fine',
          attributes: ['id', 'fineAmount', 'status'],
          required: false
        }
      ],
      order: [['detectionTime', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: violations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching recent violations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent violations',
      error: error.message
    });
  }
});

// Mark UDP reading as processed
router.patch('/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { processingNotes } = req.body;

    const reading = await UdpReading.findByPk(id);
    if (!reading) {
      return res.status(404).json({
        success: false,
        message: 'UDP reading not found'
      });
    }

    await reading.update({
      processed: true,
      processingNotes: processingNotes || 'Manually processed'
    });

    res.json({
      success: true,
      message: 'UDP reading marked as processed',
      data: reading
    });
  } catch (error) {
    console.error('Error processing UDP reading:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process UDP reading',
      error: error.message
    });
  }
});

// Delete UDP reading
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const reading = await UdpReading.findByPk(id);
    if (!reading) {
      return res.status(404).json({
        success: false,
        message: 'UDP reading not found'
      });
    }

    await reading.destroy();

    res.json({
      success: true,
      message: 'UDP reading deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting UDP reading:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete UDP reading',
      error: error.message
    });
  }
});

// Bulk operations
router.post('/bulk/process', async (req, res) => {
  try {
    const { ids, processingNotes } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or empty IDs array'
      });
    }

    const updatedCount = await UdpReading.update(
      {
        processed: true,
        processingNotes: processingNotes || 'Bulk processed'
      },
      {
        where: {
          id: {
            [Op.in]: ids
          }
        }
      }
    );

    res.json({
      success: true,
      message: `${updatedCount[0]} UDP readings marked as processed`
    });
  } catch (error) {
    console.error('Error bulk processing UDP readings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk process UDP readings',
      error: error.message
    });
  }
});

// Export UDP readings as CSV
router.get('/export/csv', async (req, res) => {
  try {
    const { startDate, endDate, radarId } = req.query;
    const where = {};

    if (radarId) where.radarId = radarId;
    if (startDate || endDate) {
      where.detectionTime = {};
      if (startDate) where.detectionTime[Op.gte] = new Date(startDate);
      if (endDate) where.detectionTime[Op.lte] = new Date(endDate);
    }

    const readings = await UdpReading.findAll({
      where,
      include: [
        {
          model: Radar,
          as: 'radar',
          attributes: ['name', 'location']
        }
      ],
      order: [['detectionTime', 'DESC']]
    });

    // Generate CSV content
    const csvHeader = 'ID,Radar ID,Radar Name,Location,Speed Detected,Speed Limit,Detection Time,Is Violation,Source IP,Message Format,Processed,Fine Created\n';
    const csvRows = readings.map(reading => {
      return [
        reading.id,
        reading.radarId,
        reading.radar ? reading.radar.name : `Radar ${reading.radarId}`,
        reading.radar ? reading.radar.location : 'Unknown',
        reading.speedDetected,
        reading.speedLimit,
        reading.detectionTime.toISOString(),
        reading.isViolation,
        reading.sourceIP || '',
        reading.messageFormat,
        reading.processed,
        reading.fineCreated
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=udp_readings_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting UDP readings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export UDP readings',
      error: error.message
    });
  }
});

module.exports = router;
