const { Op } = require('sequelize');
const { Violation, Car, Radar, User } = require('../models');

class ViolationController {
  /**
   * Create a new violation record
   * POST /api/violations
   */
  async createViolation(req, res) {
    try {
      const {
        plateNumber,
        imageUrl,
        originalFileName,
        processingMethod,
        confidence,
        vehicleInfo,
        cameraId,
        location,
        speed,
        speedLimit,
        violationType = 'speeding',
        radarId,
        carId,
        notes
      } = req.body;

      // Validate required fields
      if (!plateNumber || !imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Plate number and image URL are required'
        });
      }

      // Calculate fine amount based on violation type and speed
      let fineAmount = this.calculateFineAmount(violationType, speed, speedLimit);

      const violation = await Violation.create({
        plateNumber,
        imageUrl,
        originalFileName,
        processingMethod,
        confidence,
        vehicleInfo,
        cameraId,
        location,
        speed,
        speedLimit,
        violationType,
        fineAmount,
        notes,
        radarId,
        carId,
        timestamp: new Date(),
        status: 'pending',
        confirmed: false,
        metadata: {
          createdBy: req.user.id,
          createdAt: new Date(),
          processingMethod,
          confidence
        }
      });

      // Include related data in response
      const violationWithDetails = await Violation.findByPk(violation.id, {
        include: [
          {
            model: Car,
            as: 'car'
          },
          {
            model: Radar,
            as: 'radar'
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Violation created successfully',
        data: violationWithDetails
      });

    } catch (error) {
      console.error('Error creating violation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create violation',
        error: error.message
      });
    }
  }

  /**
   * Get all violations with filtering and pagination
   * GET /api/violations
   */
  async getAllViolations(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        plateNumber,
        violationType,
        status,
        confirmed,
        location,
        dateFrom,
        dateTo,
        minSpeed,
        maxSpeed,
        radarId
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Apply filters
      if (plateNumber) {
        whereClause.plateNumber = { [Op.like]: `%${plateNumber}%` };
      }
      if (violationType) {
        whereClause.violationType = violationType;
      }
      if (status) {
        whereClause.status = status;
      }
      if (confirmed !== undefined) {
        whereClause.confirmed = confirmed === 'true';
      }
      if (location) {
        whereClause.location = { [Op.like]: `%${location}%` };
      }
      if (dateFrom || dateTo) {
        whereClause.timestamp = {};
        if (dateFrom) whereClause.timestamp[Op.gte] = new Date(dateFrom);
        if (dateTo) whereClause.timestamp[Op.lte] = new Date(dateTo);
      }
      if (minSpeed || maxSpeed) {
        whereClause.speed = {};
        if (minSpeed) whereClause.speed[Op.gte] = parseInt(minSpeed);
        if (maxSpeed) whereClause.speed[Op.lte] = parseInt(maxSpeed);
      }
      if (radarId) {
        whereClause.radarId = radarId;
      }

      const { count, rows } = await Violation.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['timestamp', 'DESC']],
        include: [
          {
            model: Car,
            as: 'car'
          },
          {
            model: Radar,
            as: 'radar'
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      res.json({
        success: true,
        data: {
          violations: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching violations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch violations',
        error: error.message
      });
    }
  }

  /**
   * Get violation by ID
   * GET /api/violations/:id
   */
  async getViolationById(req, res) {
    try {
      const violation = await Violation.findByPk(req.params.id, {
        include: [
          {
            model: Car,
            as: 'car'
          },
          {
            model: Radar,
            as: 'radar'
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!violation) {
        return res.status(404).json({
          success: false,
          message: 'Violation not found'
        });
      }

      res.json({
        success: true,
        data: violation
      });

    } catch (error) {
      console.error('Error fetching violation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch violation',
        error: error.message
      });
    }
  }

  /**
   * Update violation status and confirmation
   * PUT /api/violations/:id
   */
  async updateViolation(req, res) {
    try {
      const {
        status,
        confirmed,
        notes,
        fineAmount,
        violationType
      } = req.body;

      const violation = await Violation.findByPk(req.params.id);

      if (!violation) {
        return res.status(404).json({
          success: false,
          message: 'Violation not found'
        });
      }

      // Update fields
      const updateData = {};
      if (status !== undefined) updateData.status = status;
      if (confirmed !== undefined) {
        updateData.confirmed = confirmed;
        if (confirmed) {
          updateData.reviewedBy = req.user.id;
          updateData.reviewedAt = new Date();
        }
      }
      if (notes !== undefined) updateData.notes = notes;
      if (fineAmount !== undefined) updateData.fineAmount = fineAmount;
      if (violationType !== undefined) updateData.violationType = violationType;

      // Update metadata
      updateData.metadata = {
        ...violation.metadata,
        lastUpdatedBy: req.user.id,
        lastUpdatedAt: new Date(),
        updateHistory: [
          ...(violation.metadata?.updateHistory || []),
          {
            updatedBy: req.user.id,
            updatedAt: new Date(),
            changes: updateData
          }
        ]
      };

      await violation.update(updateData);

      // Fetch updated violation with relations
      const updatedViolation = await Violation.findByPk(req.params.id, {
        include: [
          {
            model: Car,
            as: 'car'
          },
          {
            model: Radar,
            as: 'radar'
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Violation updated successfully',
        data: updatedViolation
      });

    } catch (error) {
      console.error('Error updating violation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update violation',
        error: error.message
      });
    }
  }

  /**
   * Delete violation
   * DELETE /api/violations/:id
   */
  async deleteViolation(req, res) {
    try {
      const violation = await Violation.findByPk(req.params.id);

      if (!violation) {
        return res.status(404).json({
          success: false,
          message: 'Violation not found'
        });
      }

      await violation.destroy();

      res.json({
        success: true,
        message: 'Violation deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting violation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete violation',
        error: error.message
      });
    }
  }

  /**
   * Get violation statistics
   * GET /api/violations/statistics
   */
  async getStatistics(req, res) {
    try {
      const totalViolations = await Violation.count();
      const pendingViolations = await Violation.count({ where: { status: 'pending' } });
      const confirmedViolations = await Violation.count({ where: { confirmed: true } });
      const todayViolations = await Violation.count({
        where: {
          timestamp: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });

      // Violation types distribution
      const violationTypes = await Violation.findAll({
        attributes: [
          'violationType',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['violationType'],
        raw: true
      });

      // Location statistics
      const locationStats = await Violation.findAll({
        attributes: [
          'location',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: {
          location: { [Op.not]: null }
        },
        group: ['location'],
        order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
        limit: 10,
        raw: true
      });

      // Speed statistics
      const speedStats = await Violation.findOne({
        attributes: [
          [require('sequelize').fn('AVG', require('sequelize').col('speed')), 'avgSpeed'],
          [require('sequelize').fn('MAX', require('sequelize').col('speed')), 'maxSpeed'],
          [require('sequelize').fn('MIN', require('sequelize').col('speed')), 'minSpeed']
        ],
        where: {
          speed: { [Op.not]: null }
        },
        raw: true
      });

      // Fine amount statistics
      const fineStats = await Violation.findOne({
        attributes: [
          [require('sequelize').fn('SUM', require('sequelize').col('fineAmount')), 'totalFines'],
          [require('sequelize').fn('AVG', require('sequelize').col('fineAmount')), 'avgFine']
        ],
        where: {
          fineAmount: { [Op.not]: null }
        },
        raw: true
      });

      res.json({
        success: true,
        data: {
          totalViolations,
          pendingViolations,
          confirmedViolations,
          todayViolations,
          confirmationRate: totalViolations > 0 ? ((confirmedViolations / totalViolations) * 100).toFixed(2) : 0,
          violationTypes,
          locationStats,
          speedStats: {
            averageSpeed: speedStats?.avgSpeed ? parseFloat(speedStats.avgSpeed).toFixed(2) : 0,
            maxSpeed: speedStats?.maxSpeed || 0,
            minSpeed: speedStats?.minSpeed || 0
          },
          fineStats: {
            totalFines: fineStats?.totalFines ? parseFloat(fineStats.totalFines).toFixed(2) : 0,
            averageFine: fineStats?.avgFine ? parseFloat(fineStats.avgFine).toFixed(2) : 0
          }
        }
      });

    } catch (error) {
      console.error('Error fetching violation statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: error.message
      });
    }
  }

  /**
   * Bulk confirm violations
   * POST /api/violations/bulk-confirm
   */
  async bulkConfirmViolations(req, res) {
    try {
      const { violationIds, notes } = req.body;

      if (!violationIds || !Array.isArray(violationIds) || violationIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Violation IDs array is required'
        });
      }

      const updateResult = await Violation.update(
        {
          confirmed: true,
          status: 'confirmed',
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          notes: notes || null
        },
        {
          where: {
            id: { [Op.in]: violationIds }
          }
        }
      );

      res.json({
        success: true,
        message: `${updateResult[0]} violations confirmed successfully`,
        data: {
          updatedCount: updateResult[0]
        }
      });

    } catch (error) {
      console.error('Error bulk confirming violations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm violations',
        error: error.message
      });
    }
  }

  /**
   * Calculate fine amount based on violation type and speed
   */
  calculateFineAmount(violationType, speed, speedLimit) {
    const baseFines = {
      'speeding': 100,
      'red_light': 200,
      'illegal_parking': 50,
      'wrong_direction': 150,
      'unauthorized_access': 300,
      'other': 75
    };

    let fineAmount = baseFines[violationType] || baseFines['other'];

    // Add speed-based penalties for speeding violations
    if (violationType === 'speeding' && speed && speedLimit) {
      const speedOver = speed - speedLimit;
      if (speedOver > 0) {
        // Add $10 for every km/h over the limit
        fineAmount += speedOver * 10;
        
        // Additional penalties for excessive speeding
        if (speedOver > 30) {
          fineAmount *= 2; // Double fine for 30+ km/h over
        } else if (speedOver > 20) {
          fineAmount *= 1.5; // 1.5x fine for 20+ km/h over
        }
      }
    }

    return parseFloat(fineAmount.toFixed(2));
  }
}

module.exports = new ViolationController();
