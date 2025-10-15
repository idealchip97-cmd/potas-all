const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 36555;

// Enable CORS for all origins
app.use(cors());

// Serve static files from current directory
app.use(express.static(__dirname));

// Serve AI processed images from processing inbox
app.use('/ai-images', express.static('/srv/processing_inbox'));

// Main route - serve the plate recognition viewer
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'plate-recognition-viewer.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Plate Recognition Server is running',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Plate Recognition Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving AI images from: /srv/processing_inbox`);
    console.log(`🔗 Main page: http://localhost:${PORT}/`);
});

module.exports = app;
