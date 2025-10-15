const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

/**
 * AI Case Controller
 * Handles AI processing of cases without verdict.json using ALPR system
 */

const AI_PROCESSOR_PATH = '/home/rnd2/Desktop/radar_system_clean/ai_case_processor.py';
const PROCESSING_INBOX_PATH = '/srv/processing_inbox';

/**
 * Execute Python AI processor
 */
const executeAIProcessor = (command, args = []) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [AI_PROCESSOR_PATH, command, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`AI Processor failed with code ${code}: ${stderr}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(error);
    });
  });
};

/**
 * Get all AI processed cases with filters
 * GET /api/ai-cases
 * Query params: camera, date, search, limit, offset
 */
const getAICases = async (req, res) => {
  try {
    const { camera, date, search, limit = 50, offset = 0 } = req.query;
    
    // Create a temporary script to get processed cases
    const scriptContent = `
import sys
sys.path.append('/home/rnd2/Desktop/radar_system_clean')
from ai_case_processor import AICaseProcessor
import json

processor = AICaseProcessor("${PROCESSING_INBOX_PATH}")
cases = processor.get_processed_cases(
    camera_filter="${camera || ''}" if "${camera || ''}" else None,
    date_filter="${date || ''}" if "${date || ''}" else None,
    search_filter="${search || ''}" if "${search || ''}" else None
)

# Apply pagination
start_idx = ${parseInt(offset)}
end_idx = start_idx + ${parseInt(limit)}
paginated_cases = cases[start_idx:end_idx]

result = {
    "cases": paginated_cases,
    "total": len(cases),
    "offset": start_idx,
    "limit": ${parseInt(limit)},
    "has_more": end_idx < len(cases)
}

print(json.dumps(result, ensure_ascii=False))
`;
    
    // Write temporary script
    const tempScriptPath = '/tmp/get_ai_cases.py';
    await fs.writeFile(tempScriptPath, scriptContent);
    
    // Execute script
    const pythonProcess = spawn('python3', [tempScriptPath]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', async (code) => {
      // Clean up temp script
      try {
        await fs.unlink(tempScriptPath);
      } catch (e) {
        console.warn('Failed to clean up temp script:', e.message);
      }
      
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          res.json({
            success: true,
            data: result
          });
        } catch (parseError) {
          console.error('Failed to parse AI processor output:', parseError);
          res.status(500).json({
            success: false,
            error: 'Failed to parse AI processor output',
            details: stdout
          });
        }
      } else {
        console.error('AI Processor failed:', stderr);
        res.status(500).json({
          success: false,
          error: 'AI processor failed',
          details: stderr
        });
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Failed to start AI processor:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start AI processor',
        details: error.message
      });
    });
    
  } catch (error) {
    console.error('Error in getAICases:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * Process all cases with verdict.json
 * POST /api/ai-cases/process
 */
const processAICases = async (req, res) => {
  try {
    console.log('Starting AI case processing...');
    
    const scriptContent = `
import sys
sys.path.append('/home/rnd2/Desktop/radar_system_clean')
from ai_case_processor import AICaseProcessor
import json

processor = AICaseProcessor("${PROCESSING_INBOX_PATH}")
results = processor.process_all_cases()

output = {
    "processed_count": len(results),
    "results": results,
    "success": True
}

print(json.dumps(output, ensure_ascii=False))
`;
    
    // Write temporary script
    const tempScriptPath = '/tmp/process_ai_cases.py';
    await fs.writeFile(tempScriptPath, scriptContent);
    
    // Execute script
    const pythonProcess = spawn('python3', [tempScriptPath]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', async (code) => {
      // Clean up temp script
      try {
        await fs.unlink(tempScriptPath);
      } catch (e) {
        console.warn('Failed to clean up temp script:', e.message);
      }
      
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          console.log(`AI processing completed: ${result.processed_count} cases processed`);
          res.json({
            success: true,
            message: `Successfully processed ${result.processed_count} cases`,
            data: result
          });
        } catch (parseError) {
          console.error('Failed to parse AI processor output:', parseError);
          res.status(500).json({
            success: false,
            error: 'Failed to parse AI processor output',
            details: stdout
          });
        }
      } else {
        console.error('AI processing failed:', stderr);
        res.status(500).json({
          success: false,
          error: 'AI processing failed',
          details: stderr
        });
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Failed to start AI processor:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start AI processor',
        details: error.message
      });
    });
    
  } catch (error) {
    console.error('Error in processAICases:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * Get cases with verdict.json (ready for AI processing)
 * GET /api/ai-cases/pending
 */
const getPendingCases = async (req, res) => {
  try {
    const scriptContent = `
import sys
sys.path.append('/home/rnd2/Desktop/radar_system_clean')
from ai_case_processor import AICaseProcessor
import json

processor = AICaseProcessor("${PROCESSING_INBOX_PATH}")
cases = processor.find_cases_with_verdict()

result = {
    "pending_cases": cases,
    "count": len(cases)
}

print(json.dumps(result, ensure_ascii=False))
`;
    
    // Write temporary script
    const tempScriptPath = '/tmp/get_pending_cases.py';
    await fs.writeFile(tempScriptPath, scriptContent);
    
    // Execute script
    const pythonProcess = spawn('python3', [tempScriptPath]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', async (code) => {
      // Clean up temp script
      try {
        await fs.unlink(tempScriptPath);
      } catch (e) {
        console.warn('Failed to clean up temp script:', e.message);
      }
      
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          res.json({
            success: true,
            data: result
          });
        } catch (parseError) {
          console.error('Failed to parse AI processor output:', parseError);
          res.status(500).json({
            success: false,
            error: 'Failed to parse AI processor output',
            details: stdout
          });
        }
      } else {
        console.error('AI Processor failed:', stderr);
        res.status(500).json({
          success: false,
          error: 'AI processor failed',
          details: stderr
        });
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Failed to start AI processor:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start AI processor',
        details: error.message
      });
    });
    
  } catch (error) {
    console.error('Error in getPendingCases:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * Get specific AI case details
 * GET /api/ai-cases/:camera/:date/:caseId
 */
const getAICaseDetails = async (req, res) => {
  try {
    const { camera, date, caseId } = req.params;
    
    const casePath = path.join(PROCESSING_INBOX_PATH, camera, date, caseId);
    const aiJsonPath = path.join(casePath, 'ai', 'ai.json');
    
    // Check if AI data exists
    if (!fsSync.existsSync(aiJsonPath)) {
      return res.status(404).json({
        success: false,
        error: 'AI data not found for this case'
      });
    }
    
    // Read AI data
    const aiData = JSON.parse(await fs.readFile(aiJsonPath, 'utf8'));
    
    // Get AI images
    const aiDir = path.join(casePath, 'ai');
    const aiImages = [];
    
    if (fsSync.existsSync(aiDir)) {
      const files = await fs.readdir(aiDir);
      for (const file of files) {
        if (file.match(/\.(jpg|jpeg|png)$/i)) {
          aiImages.push({
            filename: file,
            path: path.join(aiDir, file),
            url: `/api/ai-cases/${camera}/${date}/${caseId}/images/${file}`
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        camera_id: camera,
        date: date,
        case_id: caseId,
        case_path: casePath,
        ai_data: aiData,
        ai_images: aiImages
      }
    });
    
  } catch (error) {
    console.error('Error in getAICaseDetails:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * Serve AI processed images
 * GET /api/ai-cases/:camera/:date/:caseId/images/:filename
 */
const getAIImage = async (req, res) => {
  try {
    const { camera, date, caseId, filename } = req.params;
    
    const imagePath = path.join(PROCESSING_INBOX_PATH, camera, date, caseId, 'ai', filename);
    
    // Check if image exists
    if (!fsSync.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }
    
    // Serve the image
    res.sendFile(path.resolve(imagePath));
    
  } catch (error) {
    console.error('Error in getAIImage:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * Get AI processing statistics
 * GET /api/ai-cases/stats
 */
const getAIStats = async (req, res) => {
  try {
    const scriptContent = `
import sys
sys.path.append('/home/rnd2/Desktop/radar_system_clean')
from ai_case_processor import AICaseProcessor
import json

processor = AICaseProcessor("${PROCESSING_INBOX_PATH}")

# Get processed cases
processed_cases = processor.get_processed_cases()

# Get pending cases
pending_cases = processor.find_cases_with_verdict()

# Calculate stats
stats = {
    "total_processed": len(processed_cases),
    "total_pending": len(pending_cases),
    "cameras": {},
    "dates": {},
    "plate_detections": 0,
    "average_confidence": 0.0
}

# Process camera and date stats
for case in processed_cases:
    camera = case['camera_id']
    date = case['date']
    
    if camera not in stats['cameras']:
        stats['cameras'][camera] = 0
    stats['cameras'][camera] += 1
    
    if date not in stats['dates']:
        stats['dates'][date] = 0
    stats['dates'][date] += 1
    
    if case.get('plate_number'):
        stats['plate_detections'] += 1

# Calculate average confidence
if processed_cases:
    total_confidence = sum(case.get('confidence', 0.0) for case in processed_cases)
    stats['average_confidence'] = total_confidence / len(processed_cases)

print(json.dumps(stats, ensure_ascii=False))
`;
    
    // Write temporary script
    const tempScriptPath = '/tmp/get_ai_stats.py';
    await fs.writeFile(tempScriptPath, scriptContent);
    
    // Execute script
    const pythonProcess = spawn('python3', [tempScriptPath]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', async (code) => {
      // Clean up temp script
      try {
        await fs.unlink(tempScriptPath);
      } catch (e) {
        console.warn('Failed to clean up temp script:', e.message);
      }
      
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          res.json({
            success: true,
            data: result
          });
        } catch (parseError) {
          console.error('Failed to parse AI processor output:', parseError);
          res.status(500).json({
            success: false,
            error: 'Failed to parse AI processor output',
            details: stdout
          });
        }
      } else {
        console.error('AI Stats failed:', stderr);
        res.status(500).json({
          success: false,
          error: 'AI stats failed',
          details: stderr
        });
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Failed to start AI processor:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start AI processor',
        details: error.message
      });
    });
    
  } catch (error) {
    console.error('Error in getAIStats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

module.exports = {
  getAICases,
  processAICases,
  getPendingCases,
  getAICaseDetails,
  getAIImage,
  getAIStats
};
