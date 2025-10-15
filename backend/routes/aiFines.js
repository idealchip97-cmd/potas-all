const express = require('express');
const router = express.Router();
const { Fine, Radar } = require('../models');
const { authenticate } = require('../middleware/auth');
const axios = require('axios');

/**
 * Create fines from AI detected violations
 * POST /api/ai-fines/create-from-violations
 */
router.post('/create-from-violations', async (req, res) => {
  try {
    console.log('🚀 Starting AI fines creation process...');
    
    // Get AI violations from the AI FTP server
    const aiServerUrl = 'http://localhost:3003/api/ftp-images/violations-cycle?limit=100';
    const aiResponse = await axios.get(aiServerUrl);
    
    if (!aiResponse.data.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch AI violations'
      });
    }
    
    const violations = aiResponse.data.violations;
    console.log(`📋 Found ${violations.length} AI violations to process`);
    
    // Get or create default radar
    let radar = await Radar.findOne({ where: { name: 'AI_RADAR_001' } });
    if (!radar) {
      radar = await Radar.create({
        name: 'AI_RADAR_001',
        serialNumber: 'AI-RADAR-001-2025',
        location: 'AI Detection System',
        ipAddress: '127.0.0.1',
        speedLimit: 50,
        status: 'active',
        latitude: 31.9539,
        longitude: 35.9106,
        installationDate: new Date()
      });
      console.log('📡 Created default AI radar');
    }
    
    const createdFines = [];
    const skippedViolations = [];
    
    for (const violation of violations) {
      try {
        // Check if fine already exists for this violation
        const existingFine = await Fine.findOne({
          where: {
            vehiclePlate: violation.plates[0]?.detected_characters,
            violationDateTime: new Date(violation.processedAt)
          }
        });
        
        if (existingFine) {
          skippedViolations.push({
            id: violation.id,
            reason: 'Fine already exists',
            plateNumber: violation.plates[0]?.detected_characters
          });
          continue;
        }
        
        // Calculate fine details
        const plateNumber = violation.plates[0]?.detected_characters || 'UNKNOWN';
        const confidence = violation.confidence[0] || 0;
        
        // Mock speed data based on confidence (higher confidence = higher speed)
        const speedDetected = Math.round(50 + (confidence * 30)); // 50-80 km/h
        const speedLimit = 50;
        const violationAmount = Math.max(0, speedDetected - speedLimit);
        
        // Calculate fine amount based on violation severity
        let fineAmount = 100; // Base fine
        if (violationAmount > 20) fineAmount = 300; // High speed violation
        else if (violationAmount > 10) fineAmount = 200; // Medium speed violation
        
        // Create the fine
        const fine = await Fine.create({
          radarId: radar.id,
          vehiclePlate: plateNumber,
          speedDetected: speedDetected,
          speedLimit: speedLimit,
          violationAmount: violationAmount,
          fineAmount: fineAmount,
          violationDateTime: new Date(violation.processedAt),
          status: 'pending',
          imageUrl: `http://localhost:3003${violation.imageUrl}`,
          notes: `AI Detection - Camera: ${violation.camera}, Case: ${violation.case}, Confidence: ${(confidence * 100).toFixed(1)}%`,
          processedBy: 1, // Default admin user
          processedAt: new Date()
        });
        
        createdFines.push({
          id: fine.id,
          plateNumber: plateNumber,
          speedDetected: speedDetected,
          fineAmount: fineAmount,
          violationId: violation.id
        });
        
        console.log(`✅ Created fine for plate ${plateNumber} - Speed: ${speedDetected}km/h, Fine: $${fineAmount}`);
        
      } catch (error) {
        console.error(`❌ Error creating fine for violation ${violation.id}:`, error.message);
        skippedViolations.push({
          id: violation.id,
          reason: error.message,
          plateNumber: violation.plates[0]?.detected_characters || 'UNKNOWN'
        });
      }
    }
    
    console.log(`🎉 AI fines creation completed: ${createdFines.length} created, ${skippedViolations.length} skipped`);
    
    res.json({
      success: true,
      message: `Successfully created ${createdFines.length} fines from AI violations`,
      data: {
        createdFines: createdFines.length,
        skippedViolations: skippedViolations.length,
        totalProcessed: violations.length,
        fines: createdFines,
        skipped: skippedViolations
      }
    });
    
  } catch (error) {
    console.error('❌ Error in AI fines creation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create fines from AI violations',
      error: error.message
    });
  }
});

/**
 * Get AI fines statistics
 * GET /api/ai-fines/stats
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const totalFines = await Fine.count();
    const pendingFines = await Fine.count({ where: { status: 'pending' } });
    const processedFines = await Fine.count({ where: { status: 'processed' } });
    const paidFines = await Fine.count({ where: { status: 'paid' } });
    
    const totalAmount = await Fine.sum('fineAmount');
    const paidAmount = await Fine.sum('fineAmount', { where: { status: 'paid' } });
    
    // Get recent AI fines
    const recentFines = await Fine.findAll({
      where: {
        notes: {
          [require('sequelize').Op.like]: '%AI Detection%'
        }
      },
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [{
        model: Radar,
        as: 'radar',
        attributes: ['name', 'location']
      }]
    });
    
    res.json({
      success: true,
      data: {
        statistics: {
          totalFines,
          pendingFines,
          processedFines,
          paidFines,
          totalAmount: totalAmount || 0,
          paidAmount: paidAmount || 0,
          collectionRate: totalAmount > 0 ? ((paidAmount || 0) / totalAmount * 100).toFixed(1) : 0
        },
        recentAIFines: recentFines
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting AI fines stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI fines statistics',
      error: error.message
    });
  }
});

/**
 * Sync AI violations with fines (manual trigger)
 * POST /api/ai-fines/sync
 */
router.post('/sync', authenticate, async (req, res) => {
  try {
    // This endpoint can be called periodically to sync new AI violations
    const result = await axios.post('http://localhost:3001/api/ai-fines/create-from-violations', {}, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });
    
    res.json({
      success: true,
      message: 'AI violations sync completed',
      data: result.data
    });
    
  } catch (error) {
    console.error('❌ Error syncing AI violations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync AI violations',
      error: error.message
    });
  }
});

module.exports = router;
