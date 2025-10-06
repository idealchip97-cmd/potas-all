const fs = require('fs').promises;
const path = require('path');

// Dynamic import for node-fetch
let fetch;
(async () => {
  const fetchModule = await import('node-fetch');
  fetch = fetchModule.default;
})();

// Service to copy radar images to plate recognition system
class RadarImageCopyService {
  constructor() {
    this.imageServerUrl = 'http://localhost:3003';
    this.plateRecognitionPath = '/home/rnd2/Desktop/radar_sys/potassium-frontend/src/data/plate-recognition-images';
  }

  async copyRadarImagesToPlateRecognition() {
    try {
      console.log('📷 Starting radar image copy to plate recognition system...');
      
      // Create plate recognition images directory
      await this.ensureDirectoryExists(this.plateRecognitionPath);
      
      // Get images from radar camera001 (currently active)
      const images = await this.getRadarImages();
      console.log(`📊 Found ${images.length} images from radar001`);
      
      // Copy recent images (last 10) for plate recognition
      const recentImages = images.slice(0, 10);
      
      for (const image of recentImages) {
        await this.copyImageForPlateRecognition(image);
      }
      
      // Create metadata file for plate recognition system
      await this.createPlateRecognitionMetadata(recentImages);
      
      console.log('✅ Radar images successfully copied to plate recognition system');
      console.log(`📁 Location: ${this.plateRecognitionPath}`);
      console.log('🔍 Ready for AI plate recognition processing');
      
    } catch (error) {
      console.error('❌ Error copying radar images:', error);
    }
  }

  async getRadarImages() {
    try {
      // Ensure fetch is loaded
      if (!fetch) {
        const fetchModule = await import('node-fetch');
        fetch = fetchModule.default;
      }
      
      const response = await fetch(`${this.imageServerUrl}/api/ftp-images/list`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const images = data.files || data || [];
      
      // Filter for camera001 images (radar001)
      return images.filter(img => 
        img.url && img.url.includes('camera001') && 
        img.timestamp && 
        new Date(img.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
    } catch (error) {
      console.error('❌ Error fetching radar images:', error);
      return [];
    }
  }

  async copyImageForPlateRecognition(image) {
    try {
      // Ensure fetch is loaded
      if (!fetch) {
        const fetchModule = await import('node-fetch');
        fetch = fetchModule.default;
      }
      
      // Get image data from server
      const imageResponse = await fetch(`${this.imageServerUrl}${image.url}`);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${image.filename}`);
      }
      
      const imageBuffer = await imageResponse.buffer();
      
      // Create filename with radar info
      const timestamp = new Date(image.timestamp).toISOString().replace(/[:.]/g, '-');
      const filename = `radar001_${timestamp}_${image.filename}`;
      const filePath = path.join(this.plateRecognitionPath, filename);
      
      // Save image
      await fs.writeFile(filePath, imageBuffer);
      console.log(`📷 Copied: ${filename}`);
      
      return {
        originalFilename: image.filename,
        newFilename: filename,
        timestamp: image.timestamp,
        radarId: 1,
        radarName: 'Radar001',
        location: 'Main Gate Entry',
        filePath: filePath
      };
      
    } catch (error) {
      console.error(`❌ Error copying image ${image.filename}:`, error);
      return null;
    }
  }

  async createPlateRecognitionMetadata(images) {
    const metadata = {
      generatedAt: new Date().toISOString(),
      radarId: 1,
      radarName: 'Radar001',
      location: 'Main Gate Entry',
      speedLimit: 30,
      totalImages: images.length,
      images: images.map(img => ({
        filename: `radar001_${new Date(img.timestamp).toISOString().replace(/[:.]/g, '-')}_${img.filename}`,
        originalFilename: img.filename,
        timestamp: img.timestamp,
        size: img.size,
        processed: false,
        plateNumber: null,
        confidence: null,
        processingNotes: 'Ready for AI plate recognition'
      }))
    };
    
    const metadataPath = path.join(this.plateRecognitionPath, 'radar-images-metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('📋 Created metadata file for plate recognition');
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
  }

  async getPlateRecognitionStatus() {
    try {
      const metadataPath = path.join(this.plateRecognitionPath, 'radar-images-metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      console.log('📊 Plate Recognition Status:');
      console.log(`   Radar: ${metadata.radarName} (${metadata.location})`);
      console.log(`   Total Images: ${metadata.totalImages}`);
      console.log(`   Generated: ${new Date(metadata.generatedAt).toLocaleString()}`);
      console.log(`   Location: ${this.plateRecognitionPath}`);
      
      return metadata;
    } catch (error) {
      console.log('⚠️ No plate recognition metadata found');
      return null;
    }
  }
}

// CLI interface
async function main() {
  const service = new RadarImageCopyService();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'copy':
      await service.copyRadarImagesToPlateRecognition();
      break;
    case 'status':
      await service.getPlateRecognitionStatus();
      break;
    default:
      console.log('📷 Radar Image Copy Service');
      console.log('==========================');
      console.log('');
      console.log('Commands:');
      console.log('  node copy-radar-images.js copy   - Copy radar images to plate recognition');
      console.log('  node copy-radar-images.js status - Check plate recognition status');
      console.log('');
      console.log('Purpose:');
      console.log('  Copies images from radar001 camera to plate recognition system');
      console.log('  Prepares metadata for AI processing');
      console.log('  Enables license plate extraction from radar violations');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = RadarImageCopyService;
