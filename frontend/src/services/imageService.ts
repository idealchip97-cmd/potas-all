import axios from 'axios';

class ImageService {
  // Use relative base so CRA dev proxy routes to local image server (port 3003)
  private imageServerUrl = '';

  async getFTPImages() {
    try {
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

  // Get violation image URL from the backend API
  getViolationImageUrl(eventId: string, filename: string, date: string, cameraId: string) {
    return `http://localhost:3001/api/speeding-car-processor/event/${eventId}/photo/${filename}?date=${date}&camera_id=${cameraId}`;
  }
}

const imageService = new ImageService();
export default imageService;
