const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');

class TesseractService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Tesseract worker
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      this.worker = await Tesseract.createWorker();
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
      
      // Configure for license plate recognition
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
      });
      
      this.isInitialized = true;
      console.log('Tesseract OCR initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Tesseract:', error);
      throw error;
    }
  }

  /**
   * Preprocess image for better OCR results
   */
  async preprocessImage(imagePath) {
    try {
      const outputPath = imagePath.replace(path.extname(imagePath), '_processed.png');
      
      await sharp(imagePath)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(outputPath);
        
      return outputPath;
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  /**
   * Extract license plate number from image using Tesseract OCR
   */
  async extractLicensePlate(imagePath) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Preprocess image for better OCR
      const processedImagePath = await this.preprocessImage(imagePath);

      // Perform OCR
      const { data: { text, confidence } } = await this.worker.recognize(processedImagePath);
      
      // Clean up processed image if it's different from original
      if (processedImagePath !== imagePath) {
        try {
          const fs = require('fs').promises;
          await fs.unlink(processedImagePath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup processed image:', cleanupError.message);
        }
      }

      // Clean and validate the extracted text
      const cleanPlateNumber = this.cleanPlateNumber(text);
      const isSuccess = cleanPlateNumber !== 'NOT_FOUND' && confidence > 50;

      return {
        plateNumber: cleanPlateNumber,
        success: isSuccess,
        confidence: Math.round(confidence),
        engine: 'tesseract',
        rawText: text.trim()
      };
    } catch (error) {
      console.error('Tesseract OCR error:', error);
      return {
        plateNumber: 'NOT_FOUND',
        success: false,
        confidence: 0,
        engine: 'tesseract',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean and validate the extracted plate number
   */
  cleanPlateNumber(text) {
    if (!text || typeof text !== 'string') {
      return 'NOT_FOUND';
    }

    // Remove whitespace and convert to uppercase
    let cleaned = text.replace(/\s+/g, '').toUpperCase();

    // Remove common OCR artifacts
    cleaned = cleaned.replace(/[^A-Z0-9]/g, '');

    // Validate length (typical license plates are 3-8 characters)
    if (cleaned.length < 3 || cleaned.length > 10) {
      return 'NOT_FOUND';
    }

    // Basic validation for license plate format
    if (!/^[A-Z0-9]{3,10}$/.test(cleaned)) {
      return 'NOT_FOUND';
    }

    return cleaned;
  }

  /**
   * Process multiple images in batch
   */
  async extractLicensePlatesFromMultipleImages(imagePaths) {
    const results = [];

    for (const imagePath of imagePaths) {
      try {
        const result = await this.extractLicensePlate(imagePath);
        results.push(result);
      } catch (error) {
        results.push({
          plateNumber: 'NOT_FOUND',
          success: false,
          confidence: 0,
          engine: 'tesseract',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Cleanup resources
   */
  async terminate() {
    if (this.worker && this.isInitialized) {
      await this.worker.terminate();
      this.isInitialized = false;
      console.log('Tesseract worker terminated');
    }
  }
}

module.exports = TesseractService;
