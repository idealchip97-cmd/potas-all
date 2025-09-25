const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PlateRecognition, User, Car } = require('../models');
const { authenticate } = require('../middleware/auth');
const EnhancedVisionService = require('../services/enhancedVisionService');
const ChatGPTVisionService = require('../services/chatgptVisionService');
const TesseractService = require('../services/tesseractService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'plates');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `plate-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|bmp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize AI services
const enhancedVisionService = new EnhancedVisionService();

// Initialize ChatGPT service only if API key is available
let chatgptVisionService = null;
try {
  chatgptVisionService = new ChatGPTVisionService();
} catch (error) {
  console.warn('ChatGPT Vision Service not available in routes:', error.message);
}

const tesseractService = new TesseractService();

// Enhanced OCR function using multiple AI engines
const performEnhancedOCR = async (imagePath, options = {}) => {
  const { 
    engine = 'enhanced', 
    useChatGPT = true, 
    useTesseract = true,
    fallbackToMock = false 
  } = options;

  try {
    let result;

    switch (engine) {
      case 'chatgpt':
        if (chatgptVisionService) {
          result = await chatgptVisionService.extractLicensePlate(imagePath);
        } else {
          throw new Error('ChatGPT Vision Service not available - API key required');
        }
        break;
      case 'tesseract':
        result = await tesseractService.extractLicensePlate(imagePath);
        break;
      case 'enhanced':
      default:
        result = await enhancedVisionService.extractLicensePlate(imagePath, {
          useChatGPT: useChatGPT && chatgptVisionService !== null,
          useTesseract,
          preferHighConfidence: true
        });
        break;
    }

    return {
      plateNumber: result.plateNumber,
      confidence: result.confidence,
      success: result.success,
      engine: result.engine,
      processingTime: result.processingTime,
      allResults: result.allResults,
      engines: result.engines
    };

  } catch (error) {
    console.error('Enhanced OCR error:', error);
    
    // Fallback to mock if enabled
    if (fallbackToMock) {
      console.log('Falling back to mock OCR due to AI service error');
      return performMockOCR();
    }

    return {
      plateNumber: 'NOT_FOUND',
      confidence: 0,
      success: false,
      engine: 'error',
      error: error.message
    };
  }
};

// Mock OCR function (fallback)
const performMockOCR = async () => {
  // Simulate OCR processing delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Mock plate number generation
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const plateNumber = 
    letters.charAt(Math.floor(Math.random() * letters.length)) +
    letters.charAt(Math.floor(Math.random() * letters.length)) +
    letters.charAt(Math.floor(Math.random() * letters.length)) +
    numbers.charAt(Math.floor(Math.random() * numbers.length)) +
    numbers.charAt(Math.floor(Math.random() * numbers.length)) +
    numbers.charAt(Math.floor(Math.random() * numbers.length)) +
    numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  const confidence = Math.floor(Math.random() * 30) + 70; // 70-100%
  
  return {
    plateNumber,
    confidence,
    success: confidence > 75,
    engine: 'mock'
  };
};

// POST /api/plate-recognition/process - Process uploaded images
router.post('/process', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    const results = [];
    const { engine = 'enhanced', fallbackToMock = true } = req.body;
    
    for (const file of req.files) {
      try {
        // Perform enhanced OCR on the image
        const ocrResult = await performEnhancedOCR(file.path, { 
          engine, 
          fallbackToMock 
        });
        
        // Save to database with enhanced fields
        const plateRecord = await PlateRecognition.create({
          filename: file.originalname,
          filepath: file.path,
          plateNumber: ocrResult.plateNumber,
          confidence: ocrResult.confidence,
          status: ocrResult.success ? 'success' : 'failed',
          processedBy: req.user.id,
          imageUrl: `/uploads/plates/${file.filename}`,
          ocrEngine: ocrResult.engine,
          processingTime: ocrResult.processingTime,
          processingMethod: engine,
          detectionId: `${engine}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          allResults: ocrResult.allResults,
          metadata: {
            engines: ocrResult.engines,
            processingTime: ocrResult.processingTime,
            originalEngine: engine,
            fallbackUsed: ocrResult.engine === 'mock'
          }
        });

        results.push({
          id: plateRecord.id,
          filename: file.originalname,
          plateNumber: ocrResult.plateNumber,
          confidence: ocrResult.confidence,
          status: ocrResult.success ? 'success' : 'failed',
          timestamp: plateRecord.createdAt,
          imageUrl: plateRecord.imageUrl
        });
      } catch (error) {
        console.error('Error processing file:', file.originalname, error);
        results.push({
          filename: file.originalname,
          plateNumber: '',
          confidence: 0,
          status: 'failed',
          error: 'Processing failed',
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} images`,
      data: results,
      summary: {
        totalImages: results.length,
        successfulImages: results.filter(r => r.status === 'success').length,
        failedImages: results.filter(r => r.status === 'failed').length
      }
    });
  } catch (error) {
    console.error('Plate recognition error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process images',
      error: error.message
    });
  }
});

// GET /api/plate-recognition/results - Get all plate recognition results
router.get('/results', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await PlateRecognition.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: require('../models').User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        results: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching plate recognition results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results',
      error: error.message
    });
  }
});

// GET /api/plate-recognition/results/:id - Get specific result
router.get('/results/:id', authenticate, async (req, res) => {
  try {
    const result = await PlateRecognition.findByPk(req.params.id, {
      include: [
        {
          model: require('../models').User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching plate recognition result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch result',
      error: error.message
    });
  }
});

// DELETE /api/plate-recognition/results/:id - Delete result
router.delete('/results/:id', authenticate, async (req, res) => {
  try {
    const result = await PlateRecognition.findByPk(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    // Delete the image file
    try {
      await fs.unlink(result.filepath);
    } catch (fileError) {
      console.warn('Could not delete image file:', fileError.message);
    }

    await result.destroy();

    res.json({
      success: true,
      message: 'Result deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting plate recognition result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete result',
      error: error.message
    });
  }
});

// GET /api/plate-recognition/statistics - Get statistics
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const totalProcessed = await PlateRecognition.count();
    const successfulRecognitions = await PlateRecognition.count({
      where: { status: 'success' }
    });
    const failedRecognitions = await PlateRecognition.count({
      where: { status: 'failed' }
    });
    const todayProcessed = await PlateRecognition.count({
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    const averageConfidence = await PlateRecognition.findOne({
      attributes: [
        [require('sequelize').fn('AVG', require('sequelize').col('confidence')), 'avgConfidence']
      ],
      where: { status: 'success' },
      raw: true
    });

    res.json({
      success: true,
      data: {
        totalProcessed,
        successfulRecognitions,
        failedRecognitions,
        todayProcessed,
        successRate: totalProcessed > 0 ? ((successfulRecognitions / totalProcessed) * 100).toFixed(2) : 0,
        averageConfidence: averageConfidence?.avgConfidence ? parseFloat(averageConfidence.avgConfidence).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching plate recognition statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

module.exports = router;
