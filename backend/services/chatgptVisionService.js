const OpenAI = require('openai');
const fs = require('fs').promises;

class ChatGPTVisionService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Extract license plate number from image using ChatGPT Vision API
   */
  async extractLicensePlate(imagePath) {
    try {
      // Read and encode image to base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Call ChatGPT Vision API
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the license plate number from this car image. Return only the plate number as plain text. If no license plate is visible, return "NOT_FOUND".',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 50,
        temperature: 0, // For consistent results
      });

      const plateNumber = response.choices[0]?.message?.content?.trim() || 'NOT_FOUND';

      // Clean up the plate number (remove any extra text)
      const cleanPlateNumber = this.cleanPlateNumber(plateNumber);

      return {
        plateNumber: cleanPlateNumber,
        success: cleanPlateNumber !== 'NOT_FOUND',
        confidence: cleanPlateNumber !== 'NOT_FOUND' ? 95 : 0, // High confidence for AI recognition
        engine: 'chatgpt-vision'
      };
    } catch (error) {
      console.error('ChatGPT Vision API error:', error);
      return {
        plateNumber: 'NOT_FOUND',
        success: false,
        confidence: 0,
        engine: 'chatgpt-vision',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean and validate the extracted plate number
   */
  cleanPlateNumber(plateText) {
    if (!plateText || plateText.toLowerCase().includes('not_found') || plateText.toLowerCase().includes('not found')) {
      return 'NOT_FOUND';
    }

    // Remove common prefixes/suffixes that ChatGPT might add
    let cleaned = plateText
      .replace(/^(license plate|plate number|number):\s*/i, '')
      .replace(/\s*(license plate|plate number)$/i, '')
      .trim()
      .toUpperCase();

    // Remove quotes if present
    cleaned = cleaned.replace(/^["']|["']$/g, '');

    // Validate format (basic check for alphanumeric with possible dashes/spaces)
    if (!/^[A-Z0-9\s-]{3,10}$/.test(cleaned)) {
      return 'NOT_FOUND';
    }

    // Remove spaces and standardize format
    cleaned = cleaned.replace(/\s+/g, '');

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
          engine: 'chatgpt-vision',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }
}

module.exports = ChatGPTVisionService;
