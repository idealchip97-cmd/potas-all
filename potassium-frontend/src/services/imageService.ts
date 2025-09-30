import axios from 'axios';

class ImageService {
  private imageServerUrl = 'http://localhost:3003';

  async getFTPImages() {
    try {
      // Use direct connection to image server since it's on different port
      const response = await axios.get(`${this.imageServerUrl}/api/ftp-images/list`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load FTP images:', error);
      throw error;
    }
  }

  async getFTPImageDates() {
    try {
      const response = await axios.get(`${this.imageServerUrl}/api/ftp-images/dates`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load FTP image dates:', error);
      throw error;
    }
  }

  getImageUrl(imagePath: string) {
    return `${this.imageServerUrl}${imagePath}`;
  }
}

const imageService = new ImageService();
export default imageService;
