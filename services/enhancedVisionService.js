const ChatGPTVisionService = require('./chatgptVisionService');
const TesseractService = require('./tesseractService');

class EnhancedVisionService {
  constructor() {
    this.chatgptService = new ChatGPTVisionService();
    this.tesseractService = new TesseractService();
  }

  /**
   * Extract license plate using multiple AI engines and return best result
   */
  async extractLicensePlate(imagePath, options = {}) {
    const {
      useChatGPT = true,
      useTesseract = true,
      preferHighConfidence = true,
      timeout = 30000
    } = options;

    const results = [];
    const startTime = Date.now();

    try {
      // Run both services in parallel if both are enabled
      const promises = [];

      if (useChatGPT) {
        promises.push(
          this.runWithTimeout(
            this.chatgptService.extractLicensePlate(imagePath),
            timeout,
            'ChatGPT Vision'
          )
        );
      }

      if (useTesseract) {
        promises.push(
          this.runWithTimeout(
            this.tesseractService.extractLicensePlate(imagePath),
            timeout,
            'Tesseract'
          )
        );
      }

      // Wait for all promises to resolve
      const serviceResults = await Promise.allSettled(promises);

      // Process results
      serviceResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else {
          const serviceName = index === 0 ? 'ChatGPT' : 'Tesseract';
          console.error(`${serviceName} service failed:`, result.reason);
        }
      });

      // Select best result
      const bestResult = this.selectBestResult(results, preferHighConfidence);
      const processingTime = Date.now() - startTime;

      return {
        ...bestResult,
        processingTime,
        engines: results.map(r => r.engine),
        allResults: results
      };

    } catch (error) {
      console.error('Enhanced vision service error:', error);
      return {
        plateNumber: 'NOT_FOUND',
        success: false,
        confidence: 0,
        engine: 'enhanced-vision',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run a promise with timeout
   */
  async runWithTimeout(promise, timeout, serviceName) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${serviceName} timeout`)), timeout)
      )
    ]);
  }

  /**
   * Select the best result from multiple AI engines
   */
  selectBestResult(results, preferHighConfidence = true) {
    if (results.length === 0) {
      return {
        plateNumber: 'NOT_FOUND',
        success: false,
        confidence: 0,
        engine: 'enhanced-vision'
      };
    }

    // Filter successful results
    const successfulResults = results.filter(r => r.success && r.plateNumber !== 'NOT_FOUND');

    if (successfulResults.length === 0) {
      // Return the result with highest confidence even if unsuccessful
      const bestFailure = results.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      return {
        ...bestFailure,
        engine: 'enhanced-vision'
      };
    }

    // If we have successful results, choose based on strategy
    if (preferHighConfidence) {
      // Choose result with highest confidence
      const bestResult = successfulResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      return {
        ...bestResult,
        engine: 'enhanced-vision'
      };
    } else {
      // Choose ChatGPT result if available (generally more accurate)
      const chatgptResult = successfulResults.find(r => r.engine === 'chatgpt-vision');
      if (chatgptResult) {
        return {
          ...chatgptResult,
          engine: 'enhanced-vision'
        };
      }
      
      // Fallback to highest confidence
      const bestResult = successfulResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      return {
        ...bestResult,
        engine: 'enhanced-vision'
      };
    }
  }

  /**
   * Extract license plates from multiple images
   */
  async extractLicensePlatesFromMultipleImages(imagePaths, options = {}) {
    const results = [];

    for (const imagePath of imagePaths) {
      try {
        const result = await this.extractLicensePlate(imagePath, options);
        results.push(result);
      } catch (error) {
        results.push({
          plateNumber: 'NOT_FOUND',
          success: false,
          confidence: 0,
          engine: 'enhanced-vision',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get service statistics
   */
  getServiceStats(results) {
    const stats = {
      total: results.length,
      successful: 0,
      failed: 0,
      averageConfidence: 0,
      averageProcessingTime: 0,
      engineUsage: {}
    };

    let totalConfidence = 0;
    let totalProcessingTime = 0;

    results.forEach(result => {
      if (result.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }

      totalConfidence += result.confidence || 0;
      totalProcessingTime += result.processingTime || 0;

      // Track engine usage
      if (result.engines && Array.isArray(result.engines)) {
        result.engines.forEach(engine => {
          stats.engineUsage[engine] = (stats.engineUsage[engine] || 0) + 1;
        });
      }
    });

    stats.averageConfidence = results.length > 0 ? totalConfidence / results.length : 0;
    stats.averageProcessingTime = results.length > 0 ? totalProcessingTime / results.length : 0;
    stats.successRate = results.length > 0 ? (stats.successful / results.length) * 100 : 0;

    return stats;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      await this.tesseractService.terminate();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

module.exports = EnhancedVisionService;
