const { Radar, Fine } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const getAllRadars = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, location } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (location) whereClause.location = { [Op.like]: `%${location}%` };

    const radars = await Radar.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [{
        model: Fine,
        as: 'fines',
        attributes: ['id', 'status'],
        required: false
      }]
    });

    // Add statistics for each radar
    const radarsWithStats = await Promise.all(
      radars.rows.map(async (radar) => {
        const totalFines = await Fine.count({ where: { radarId: radar.id } });
        const pendingFines = await Fine.count({ 
          where: { radarId: radar.id, status: 'pending' } 
        });
        
        return {
          ...radar.toJSON(),
          statistics: {
            totalFines,
            pendingFines
          }
        };
      })
    );

    res.json({
      success: true,
      message: 'Radars retrieved successfully',
      data: {
        radars: radarsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(radars.count / limit),
          totalItems: radars.count,
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

const getRadarById = async (req, res) => {
  try {
    const { id } = req.params;

    const radar = await Radar.findByPk(id, {
      include: [{
        model: Fine,
        as: 'fines',
        limit: 10,
        order: [['createdAt', 'DESC']]
      }]
    });

    if (!radar) {
      return res.status(404).json({
        success: false,
        message: 'Radar not found'
      });
    }

    // Get radar statistics
    const totalFines = await Fine.count({ where: { radarId: id } });
    const pendingFines = await Fine.count({ 
      where: { radarId: id, status: 'pending' } 
    });
    const processedFines = await Fine.count({ 
      where: { radarId: id, status: 'processed' } 
    });

    res.json({
      success: true,
      message: 'Radar retrieved successfully',
      data: {
        radar: {
          ...radar.toJSON(),
          statistics: {
            totalFines,
            pendingFines,
            processedFines
          }
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

module.exports = {
  getAllRadars,
  getRadarById
};
