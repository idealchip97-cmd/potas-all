const { Fine, Radar, User } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const getAllFines = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      radarId, 
      startDate, 
      endDate,
      minSpeed,
      maxSpeed 
    } = req.query;
    
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (radarId) whereClause.radarId = radarId;
    if (minSpeed) whereClause.speedDetected = { [Op.gte]: minSpeed };
    if (maxSpeed) whereClause.speedDetected = { [Op.lte]: maxSpeed };
    if (startDate && endDate) {
      whereClause.violationDateTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const fines = await Fine.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['violationDateTime', 'DESC']],
      include: [
        {
          model: Radar,
          as: 'radar',
          attributes: ['id', 'name', 'location', 'speedLimit']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      message: 'Fines retrieved successfully',
      data: {
        fines: fines.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(fines.count / limit),
          totalItems: fines.count,
          itemsPerPage: parseInt(limit)
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

const getFinesByRadarId = async (req, res) => {
  try {
    const { radarId } = req.params;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    // Check if radar exists
    const radar = await Radar.findByPk(radarId);
    if (!radar) {
      return res.status(404).json({
        success: false,
        message: 'Radar not found'
      });
    }

    const whereClause = { radarId };
    if (status) whereClause.status = status;
    if (startDate && endDate) {
      whereClause.violationDateTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const fines = await Fine.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['violationDateTime', 'DESC']],
      include: [
        {
          model: Radar,
          as: 'radar',
          attributes: ['id', 'name', 'location', 'speedLimit']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ]
    });

    // Get statistics for this radar
    const totalFines = await Fine.count({ where: { radarId } });
    const pendingFines = await Fine.count({ 
      where: { radarId, status: 'pending' } 
    });
    const processedFines = await Fine.count({ 
      where: { radarId, status: 'processed' } 
    });

    res.json({
      success: true,
      message: 'Fines retrieved successfully',
      data: {
        radar: {
          id: radar.id,
          name: radar.name,
          location: radar.location
        },
        fines: fines.rows,
        statistics: {
          totalFines,
          pendingFines,
          processedFines
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(fines.count / limit),
          totalItems: fines.count,
          itemsPerPage: parseInt(limit)
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

const getFineById = async (req, res) => {
  try {
    const { id } = req.params;

    const fine = await Fine.findByPk(id, {
      include: [
        {
          model: Radar,
          as: 'radar',
          attributes: ['id', 'name', 'location', 'speedLimit']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ]
    });

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: 'Fine not found'
      });
    }

    res.json({
      success: true,
      message: 'Fine retrieved successfully',
      data: { fine }
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
  getAllFines,
  getFinesByRadarId,
  getFineById
};
