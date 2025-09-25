const { Op } = require('sequelize');
const { Car, PlateRecognition, User } = require('../models');
const EnhancedVisionService = require('../services/enhancedVisionService');
const fs = require('fs').promises;

const enhancedVisionService = new EnhancedVisionService();

class OptimizedCarController {
  /**
   * Recognize cars from uploaded images using enhanced AI vision
   * POST /api/cars/recognize
   */
  async recognizeCars(req, res) {
    try {
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No images uploaded',
        });
      }

      console.log(`🚗 Processing ${files.length} images for car recognition using Enhanced Vision API`);

      const allRecognizedCars = [];
      const processingResults = [];
      
      for (const file of files) {
        try {
          console.log(`📸 Analyzing image: ${file.originalname}`);
          
          // Analyze cars using Enhanced Vision Service
          const result = await enhancedVisionService.extractLicensePlate(file.path, {
            useChatGPT: true,
            useTesseract: true,
            preferHighConfidence: true
          });
          
          if (result.success && result.plateNumber !== 'NOT_FOUND') {
            console.log(`✅ Found car with plate ${result.plateNumber} in ${file.originalname}`);
            
            // Create plate recognition record
            const plateRecord = await PlateRecognition.create({
              filename: file.originalname,
              filepath: file.path,
              plateNumber: result.plateNumber,
              confidence: result.confidence,
              status: 'success',
              processedBy: req.user.id,
              imageUrl: `/uploads/plates/${file.filename}`,
              ocrEngine: result.engine,
              processingTime: result.processingTime,
              processingMethod: 'optimized-enhanced',
              detectionId: `optimized_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              allResults: result.allResults,
              metadata: {
                engines: result.engines,
                processingTime: result.processingTime,
                allResults: result.allResults
              }
            });

            // Create car record with enhanced detection
            const car = await Car.create({
              plateNumber: result.plateNumber,
              color: this.detectVehicleColor(file.originalname) || 'Unknown',
              type: this.detectVehicleType(file.originalname) || 'Unknown',
              imageUrl: `/uploads/plates/${file.filename}`,
              imagePath: file.path,
              confidence: result.confidence,
              detectionId: `optimized_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date(),
              processingEngine: result.engine,
              plateRecognitionId: plateRecord.id,
              metadata: {
                originalFilename: file.originalname,
                processingTime: result.processingTime,
                engines: result.engines
              }
            });

            allRecognizedCars.push({
              id: car.id,
              plateNumber: car.plateNumber,
              color: car.color,
              type: car.type,
              imageUrl: car.imageUrl,
              confidence: car.confidence,
              timestamp: car.timestamp,
              processingEngine: car.processingEngine,
              plateRecognitionId: plateRecord.id
            });

            processingResults.push({
              filename: file.originalname,
              status: 'success',
              plateNumber: result.plateNumber,
              confidence: result.confidence,
              processingTime: result.processingTime
            });

            console.log(`💾 Saved car to database: Plate ${car.plateNumber}, ${car.color} ${car.type}`);
          } else {
            // Failed recognition
            await PlateRecognition.create({
              filename: file.originalname,
              filepath: file.path,
              plateNumber: '',
              confidence: result.confidence || 0,
              status: 'failed',
              processedBy: req.user.id,
              imageUrl: `/uploads/plates/${file.filename}`,
              ocrEngine: result.engine || 'enhanced-vision',
              processingTime: result.processingTime || 0,
              processingMethod: 'optimized-enhanced',
              errorMessage: result.error || 'No plate detected',
              metadata: {
                engines: result.engines || [],
                error: result.error
              }
            });

            processingResults.push({
              filename: file.originalname,
              status: 'failed',
              error: result.error || 'No plate detected',
              confidence: result.confidence || 0
            });

            console.log(`❌ Failed to detect plate in ${file.originalname}`);
          }
        } catch (fileError) {
          console.error(`❌ Error processing ${file.originalname}:`, fileError);
          processingResults.push({
            filename: file.originalname,
            status: 'error',
            error: fileError.message
          });
        }
      }

      // Calculate statistics
      const stats = this.calculateProcessingStats(processingResults);

      res.json({
        success: true,
        message: `Processed ${files.length} images with optimized AI recognition`,
        data: {
          recognizedCars: allRecognizedCars,
          processingResults,
          statistics: stats
        }
      });

    } catch (error) {
      console.error('❌ Optimized car recognition error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process car recognition',
        error: error.message,
      });
    }
  }

  /**
   * Get all recognized cars with advanced filtering
   * GET /api/cars
   */
  async getAllCars(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        plateNumber, 
        color, 
        type, 
        dateFrom, 
        dateTo,
        minConfidence,
        processingEngine
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Apply filters
      if (plateNumber) {
        whereClause.plateNumber = { [Op.like]: `%${plateNumber}%` };
      }
      if (color) {
        whereClause.color = { [Op.like]: `%${color}%` };
      }
      if (type) {
        whereClause.type = { [Op.like]: `%${type}%` };
      }
      if (dateFrom || dateTo) {
        whereClause.timestamp = {};
        if (dateFrom) whereClause.timestamp[Op.gte] = new Date(dateFrom);
        if (dateTo) whereClause.timestamp[Op.lte] = new Date(dateTo);
      }
      if (minConfidence) {
        whereClause.confidence = { [Op.gte]: parseFloat(minConfidence) };
      }
      if (processingEngine) {
        whereClause.processingEngine = processingEngine;
      }

      const { count, rows } = await Car.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['timestamp', 'DESC']],
        include: [
          {
            model: PlateRecognition,
            as: 'plateRecognition',
            include: [
              {
                model: User,
                as: 'processor',
                attributes: ['id', 'firstName', 'lastName', 'email']
              }
            ]
          }
        ]
      });

      res.json({
        success: true,
        data: {
          cars: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching cars:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cars',
        error: error.message
      });
    }
  }

  /**
   * Get car by ID with full details
   * GET /api/cars/:id
   */
  async getCarById(req, res) {
    try {
      const car = await Car.findByPk(req.params.id, {
        include: [
          {
            model: PlateRecognition,
            as: 'plateRecognition',
            include: [
              {
                model: User,
                as: 'processor',
                attributes: ['id', 'firstName', 'lastName', 'email']
              }
            ]
          }
        ]
      });

      if (!car) {
        return res.status(404).json({
          success: false,
          message: 'Car not found'
        });
      }

      res.json({
        success: true,
        data: car
      });

    } catch (error) {
      console.error('Error fetching car:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch car',
        error: error.message
      });
    }
  }

  /**
   * Delete car record
   * DELETE /api/cars/:id
   */
  async deleteCar(req, res) {
    try {
      const car = await Car.findByPk(req.params.id);

      if (!car) {
        return res.status(404).json({
          success: false,
          message: 'Car not found'
        });
      }

      // Delete associated image file if exists
      if (car.imagePath) {
        try {
          await fs.unlink(car.imagePath);
        } catch (fileError) {
          console.warn('Could not delete image file:', fileError.message);
        }
      }

      await car.destroy();

      res.json({
        success: true,
        message: 'Car deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting car:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete car',
        error: error.message
      });
    }
  }

  /**
   * Get car recognition statistics
   * GET /api/cars/statistics
   */
  async getStatistics(req, res) {
    try {
      const totalCars = await Car.count();
      const todayCars = await Car.count({
        where: {
          timestamp: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });

      const avgConfidence = await Car.findOne({
        attributes: [
          [require('sequelize').fn('AVG', require('sequelize').col('confidence')), 'avgConfidence']
        ],
        raw: true
      });

      const engineStats = await Car.findAll({
        attributes: [
          'processingEngine',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['processingEngine'],
        raw: true
      });

      const colorStats = await Car.findAll({
        attributes: [
          'color',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['color'],
        order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
        limit: 10,
        raw: true
      });

      res.json({
        success: true,
        data: {
          totalCars,
          todayCars,
          averageConfidence: avgConfidence?.avgConfidence ? parseFloat(avgConfidence.avgConfidence).toFixed(2) : 0,
          engineStats,
          colorStats
        }
      });

    } catch (error) {
      console.error('Error fetching car statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: error.message
      });
    }
  }

  /**
   * Helper method to detect vehicle color from filename or metadata
   */
  detectVehicleColor(filename) {
    const colorKeywords = {
      'red': ['red', 'rouge'],
      'blue': ['blue', 'bleu'],
      'white': ['white', 'blanc'],
      'black': ['black', 'noir'],
      'gray': ['gray', 'grey', 'gris'],
      'silver': ['silver', 'argent'],
      'green': ['green', 'vert'],
      'yellow': ['yellow', 'jaune']
    };

    const lowerFilename = filename.toLowerCase();
    for (const [color, keywords] of Object.entries(colorKeywords)) {
      if (keywords.some(keyword => lowerFilename.includes(keyword))) {
        return color.charAt(0).toUpperCase() + color.slice(1);
      }
    }
    return null;
  }

  /**
   * Helper method to detect vehicle type from filename or metadata
   */
  detectVehicleType(filename) {
    const typeKeywords = {
      'sedan': ['sedan', 'berline'],
      'suv': ['suv', '4x4'],
      'truck': ['truck', 'camion'],
      'van': ['van', 'fourgon'],
      'motorcycle': ['moto', 'bike'],
      'bus': ['bus', 'autobus']
    };

    const lowerFilename = filename.toLowerCase();
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(keyword => lowerFilename.includes(keyword))) {
        return type.toUpperCase();
      }
    }
    return null;
  }

  /**
   * Calculate processing statistics
   */
  calculateProcessingStats(results) {
    const total = results.length;
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.status === 'error').length;

    const avgConfidence = results
      .filter(r => r.confidence)
      .reduce((sum, r) => sum + r.confidence, 0) / Math.max(successful, 1);

    const avgProcessingTime = results
      .filter(r => r.processingTime)
      .reduce((sum, r) => sum + r.processingTime, 0) / Math.max(successful, 1);

    return {
      total,
      successful,
      failed,
      errors,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) : 0,
      averageConfidence: avgConfidence.toFixed(2),
      averageProcessingTime: Math.round(avgProcessingTime)
    };
  }
}

module.exports = new OptimizedCarController();
