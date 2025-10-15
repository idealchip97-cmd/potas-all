const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3004;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve static files from AI folders
app.use('/ai-images', express.static('/srv/processing_inbox'));

// Serve the AI Results Viewer HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/ai_results_viewer.html'));
});

/**
 * Get all cases with AI processing results
 */
app.get('/api/ai-cases', async (req, res) => {
    try {
        console.log('🔍 Fetching AI processed cases...');
        const processingInbox = '/srv/processing_inbox';
        const cases = [];

        // Read all camera directories
        const cameras = await fs.readdir(processingInbox);
        
        for (const camera of cameras) {
            const cameraPath = path.join(processingInbox, camera);
            const stat = await fs.stat(cameraPath);
            
            if (!stat.isDirectory()) continue;
            
            // Read all date directories
            const dates = await fs.readdir(cameraPath);
            
            for (const date of dates) {
                const datePath = path.join(cameraPath, date);
                const dateStat = await fs.stat(datePath);
                
                if (!dateStat.isDirectory()) continue;
                
                // Read all case directories
                const caseNames = await fs.readdir(datePath);
                
                for (const caseName of caseNames) {
                    const casePath = path.join(datePath, caseName);
                    const caseStat = await fs.stat(casePath);
                    
                    if (!caseStat.isDirectory()) continue;
                    
                    // Check if AI folder exists
                    const aiPath = path.join(casePath, 'ai');
                    const aiResultsPath = path.join(aiPath, 'ai_detection_results.json');
                    
                    try {
                        await fs.access(aiResultsPath);
                        
                        // Read AI results
                        const aiResults = JSON.parse(await fs.readFile(aiResultsPath, 'utf8'));
                        
                        // Read original case data
                        let originalData = {};
                        const verdictPath = path.join(casePath, 'verdict.json');
                        try {
                            originalData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
                        } catch (e) {
                            console.warn(`⚠️ Could not read verdict for ${caseName}`);
                        }
                        
                        cases.push({
                            id: `${camera}_${date}_${caseName}`,
                            camera,
                            date,
                            caseName,
                            casePath: `/ai-images/${camera}/${date}/${caseName}`,
                            aiResults,
                            originalData,
                            processingTimestamp: aiResults.processing_timestamp,
                            imagesProcessed: aiResults.images_processed,
                            platesDetected: aiResults.total_plates_detected
                        });
                        
                    } catch (e) {
                        // No AI results for this case
                        continue;
                    }
                }
            }
        }
        
        // Sort by processing timestamp (newest first)
        cases.sort((a, b) => new Date(b.processingTimestamp) - new Date(a.processingTimestamp));
        
        console.log(`✅ Found ${cases.length} AI processed cases`);
        res.json({
            success: true,
            cases,
            total: cases.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching AI cases:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get specific case AI results with detailed image information
 */
app.get('/api/ai-cases/:caseId', async (req, res) => {
    try {
        const { caseId } = req.params;
        const [camera, date, caseName] = caseId.split('_');
        
        console.log(`🔍 Fetching detailed AI results for case: ${caseId}`);
        
        const casePath = path.join('/srv/processing_inbox', camera, date, caseName);
        const aiPath = path.join(casePath, 'ai');
        const aiResultsPath = path.join(aiPath, 'ai_detection_results.json');
        
        // Read AI results
        const aiResults = JSON.parse(await fs.readFile(aiResultsPath, 'utf8'));
        
        // Get all processed images with their URLs
        const processedImages = [];
        for (const imageInfo of aiResults.processed_images) {
            const originalImageUrl = `/ai-images/${camera}/${date}/${caseName}/${imageInfo.filename}`;
            const processedImageUrl = `/ai-images/${camera}/${date}/${caseName}/ai/processed_${imageInfo.filename}`;
            
            processedImages.push({
                ...imageInfo,
                originalImageUrl,
                processedImageUrl,
                plates: imageInfo.alpr_result.plates_detected || []
            });
        }
        
        // Read original case data
        let originalData = {};
        const verdictPath = path.join(casePath, 'verdict.json');
        try {
            originalData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
        } catch (e) {
            console.warn(`⚠️ Could not read verdict for ${caseId}`);
        }
        
        const detailedResults = {
            ...aiResults,
            caseId,
            camera,
            date,
            caseName,
            originalData,
            processedImages,
            casePath: `/ai-images/${camera}/${date}/${caseName}`
        };
        
        console.log(`✅ Retrieved detailed results for case: ${caseId}`);
        res.json({
            success: true,
            case: detailedResults
        });
        
    } catch (error) {
        console.error(`❌ Error fetching case ${req.params.caseId}:`, error);
        res.status(404).json({
            success: false,
            error: 'Case not found or no AI results available'
        });
    }
});

/**
 * Get AI processing statistics
 */
app.get('/api/ai-stats', async (req, res) => {
    try {
        console.log('📊 Calculating AI processing statistics...');
        
        const processingInbox = '/srv/processing_inbox';
        let totalCases = 0;
        let processedCases = 0;
        let totalImages = 0;
        let totalPlatesDetected = 0;
        let cameraStats = {};
        
        // Read all camera directories
        const cameras = await fs.readdir(processingInbox);
        
        for (const camera of cameras) {
            const cameraPath = path.join(processingInbox, camera);
            const stat = await fs.stat(cameraPath);
            
            if (!stat.isDirectory()) continue;
            
            cameraStats[camera] = {
                totalCases: 0,
                processedCases: 0,
                totalPlates: 0
            };
            
            // Read all date directories
            const dates = await fs.readdir(cameraPath);
            
            for (const date of dates) {
                const datePath = path.join(cameraPath, date);
                const dateStat = await fs.stat(datePath);
                
                if (!dateStat.isDirectory()) continue;
                
                // Read all case directories
                const caseNames = await fs.readdir(datePath);
                
                for (const caseName of caseNames) {
                    const casePath = path.join(datePath, caseName);
                    const caseStat = await fs.stat(casePath);
                    
                    if (!caseStat.isDirectory()) continue;
                    
                    totalCases++;
                    cameraStats[camera].totalCases++;
                    
                    // Check if AI folder exists
                    const aiPath = path.join(casePath, 'ai');
                    const aiResultsPath = path.join(aiPath, 'ai_detection_results.json');
                    
                    try {
                        await fs.access(aiResultsPath);
                        
                        // Read AI results
                        const aiResults = JSON.parse(await fs.readFile(aiResultsPath, 'utf8'));
                        
                        processedCases++;
                        cameraStats[camera].processedCases++;
                        totalImages += aiResults.images_processed || 0;
                        totalPlatesDetected += aiResults.total_plates_detected || 0;
                        cameraStats[camera].totalPlates += aiResults.total_plates_detected || 0;
                        
                    } catch (e) {
                        // No AI results for this case
                        continue;
                    }
                }
            }
        }
        
        const stats = {
            totalCases,
            processedCases,
            unprocessedCases: totalCases - processedCases,
            processingRate: totalCases > 0 ? ((processedCases / totalCases) * 100).toFixed(1) : 0,
            totalImages,
            totalPlatesDetected,
            averagePlatesPerCase: processedCases > 0 ? (totalPlatesDetected / processedCases).toFixed(1) : 0,
            cameraStats
        };
        
        console.log('✅ AI statistics calculated:', stats);
        res.json({
            success: true,
            stats
        });
        
    } catch (error) {
        console.error('❌ Error calculating AI stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'AI Results API is running',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AI Results API Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving AI images from: /srv/processing_inbox`);
    console.log(`🔗 API endpoints:`);
    console.log(`   • GET /api/ai-cases - List all AI processed cases`);
    console.log(`   • GET /api/ai-cases/:caseId - Get detailed case results`);
    console.log(`   • GET /api/ai-stats - Get AI processing statistics`);
    console.log(`   • GET /health - Health check`);
});

module.exports = app;
