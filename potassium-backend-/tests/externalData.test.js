const request = require('supertest');
const express = require('express');
const externalDataService = require('../services/externalDataService');
const FTPService = require('../services/ftpService');
const UDPService = require('../services/udpService');
const dataProcessor = require('../services/dataProcessorService');

// Mock the external services for testing
jest.mock('../services/ftpService');
jest.mock('../services/udpService');

describe('External Data Services', () => {
    let app;
    let adminToken;

    beforeAll(async () => {
        // Setup test app
        app = express();
        app.use(express.json());
        app.use('/api/external-data', require('../routes/externalData'));
        
        // Mock admin token (you'll need to adjust this based on your auth system)
        adminToken = 'mock-admin-token';
    });

    afterAll(async () => {
        // Cleanup
        if (externalDataService.isRunning) {
            await externalDataService.stop();
        }
    });

    describe('FTP Service', () => {
        test('should create FTP service instance', () => {
            const ftpService = new FTPService();
            expect(ftpService).toBeDefined();
            expect(ftpService.config.host).toBe('192.186.1.14');
            expect(ftpService.config.port).toBe(21);
        });

        test('should handle connection', async () => {
            const ftpService = new FTPService();
            
            // Mock successful connection
            ftpService.client.connect = jest.fn();
            ftpService.client.once = jest.fn((event, callback) => {
                if (event === 'ready') {
                    setTimeout(callback, 10);
                }
            });

            await expect(ftpService.connect()).resolves.toBeUndefined();
        });

        test('should list image files', async () => {
            const ftpService = new FTPService();
            ftpService.isConnected = true;
            
            const mockFiles = [
                { name: 'image1.jpg', type: '-' },
                { name: 'image2.png', type: '-' },
                { name: 'document.txt', type: '-' }
            ];

            ftpService.client.list = jest.fn((path, callback) => {
                callback(null, mockFiles);
            });

            const imageFiles = await ftpService.listFiles('/');
            expect(imageFiles).toHaveLength(2);
            expect(imageFiles[0].name).toBe('image1.jpg');
            expect(imageFiles[1].name).toBe('image2.png');
        });
    });

    describe('UDP Service', () => {
        test('should create UDP service instance', () => {
            const udpService = new UDPService();
            expect(udpService).toBeDefined();
            expect(udpService.config.host).toBe('192.186.1.14');
            expect(udpService.config.port).toBe(17081);
        });

        test('should parse JSON radar data', () => {
            const udpService = new UDPService();
            const jsonData = JSON.stringify({
                radarId: 'R001',
                location: 'Main Gate',
                status: 'active',
                lastPing: '2024-01-01T10:00:00Z'
            });

            const parsed = udpService.parseMessage(jsonData);
            expect(parsed.type).toBe('radar');
            expect(parsed.radarId).toBe('R001');
            expect(parsed.location).toBe('Main Gate');
        });

        test('should parse JSON fine data', () => {
            const udpService = new UDPService();
            const jsonData = JSON.stringify({
                plateNumber: 'ABC123',
                speed: 80,
                speedLimit: 50,
                radarId: 'R001',
                location: 'Highway 1'
            });

            const parsed = udpService.parseMessage(jsonData);
            expect(parsed.type).toBe('fine');
            expect(parsed.plateNumber).toBe('ABC123');
            expect(parsed.speed).toBe(80);
        });

        test('should parse delimited fine data', () => {
            const udpService = new UDPService();
            const message = 'fine,XYZ789,90,60,R002';

            const parsed = udpService.parseMessage(message);
            expect(parsed.type).toBe('fine');
            expect(parsed.plateNumber).toBe('XYZ789');
            expect(parsed.speed).toBe(90);
            expect(parsed.speedLimit).toBe(60);
        });
    });

    describe('Data Processor', () => {
        test('should calculate fine amounts correctly', () => {
            // Test different overspeed scenarios
            expect(dataProcessor.calculateFineAmount(55, 50)).toBe(100); // 5 km/h over
            expect(dataProcessor.calculateFineAmount(65, 50)).toBe(200); // 15 km/h over
            expect(dataProcessor.calculateFineAmount(75, 50)).toBe(400); // 25 km/h over
            expect(dataProcessor.calculateFineAmount(95, 50)).toBe(800); // 45 km/h over
            expect(dataProcessor.calculateFineAmount(110, 50)).toBe(1500); // 60 km/h over
        });

        test('should create message hash for deduplication', () => {
            const data1 = { plateNumber: 'ABC123', radarId: 'R001', timestamp: '2024-01-01T10:00:00Z' };
            const data2 = { plateNumber: 'ABC123', radarId: 'R001', timestamp: '2024-01-01T10:00:00Z' };
            const data3 = { plateNumber: 'XYZ789', radarId: 'R001', timestamp: '2024-01-01T10:00:00Z' };

            const hash1 = dataProcessor.createMessageHash(data1);
            const hash2 = dataProcessor.createMessageHash(data2);
            const hash3 = dataProcessor.createMessageHash(data3);

            expect(hash1).toBe(hash2); // Same data should produce same hash
            expect(hash1).not.toBe(hash3); // Different data should produce different hash
        });
    });

    describe('API Endpoints', () => {
        test('GET /api/external-data/health should return health status', async () => {
            const response = await request(app)
                .get('/api/external-data/health');

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.timestamp).toBeDefined();
        });

        // Note: These tests would need proper authentication setup
        // test('POST /api/external-data/start should start services', async () => {
        //     const response = await request(app)
        //         .post('/api/external-data/start')
        //         .set('Authorization', `Bearer ${adminToken}`);

        //     expect(response.status).toBe(200);
        //     expect(response.body.success).toBe(true);
        // });
    });

    describe('Integration Tests', () => {
        test('should handle FTP image download event', (done) => {
            const mockImagePath = '/test/path/image.jpg';
            
            externalDataService.once('imageProcessed', (result) => {
                expect(result).toBeDefined();
                expect(result.fileName).toBe('image.jpg');
                done();
            });

            // Simulate FTP image download
            externalDataService.ftpService.emit('imageDownloaded', mockImagePath);
        });

        test('should handle UDP radar data event', (done) => {
            const mockRadarData = {
                radarId: 'R001',
                location: 'Test Location',
                status: 'active'
            };

            externalDataService.once('radarProcessed', (result) => {
                expect(result).toBeDefined();
                done();
            });

            // Simulate UDP radar data
            externalDataService.udpService.emit('radarData', mockRadarData);
        });

        test('should handle UDP fine data event', (done) => {
            const mockFineData = {
                plateNumber: 'TEST123',
                speed: 70,
                speedLimit: 50,
                radarId: 'R001'
            };

            externalDataService.once('fineProcessed', (result) => {
                expect(result).toBeDefined();
                done();
            });

            // Simulate UDP fine data
            externalDataService.udpService.emit('fineData', mockFineData);
        });
    });

    describe('Error Handling', () => {
        test('should handle FTP connection errors gracefully', () => {
            const ftpService = new FTPService();
            
            expect(() => {
                ftpService.emit('error', new Error('Connection failed'));
            }).not.toThrow();
        });

        test('should handle UDP parsing errors gracefully', () => {
            const udpService = new UDPService();
            const invalidMessage = 'invalid-json-{';

            const parsed = udpService.parseMessage(invalidMessage);
            expect(parsed.type).toBe('unknown');
            expect(parsed.rawMessage).toBe(invalidMessage);
        });

        test('should handle malformed UDP data', () => {
            const udpService = new UDPService();
            const malformedMessage = 'incomplete,data';

            const parsed = udpService.parseMessage(malformedMessage);
            expect(parsed.type).toBe('unknown');
            expect(parsed.parts).toHaveLength(2);
        });
    });
});

describe('Service Statistics', () => {
    test('should track processing statistics', () => {
        const stats = externalDataService.getStats();
        
        expect(stats).toHaveProperty('imagesProcessed');
        expect(stats).toHaveProperty('radarUpdates');
        expect(stats).toHaveProperty('finesReceived');
        expect(stats).toHaveProperty('violationsReceived');
        expect(stats).toHaveProperty('errors');
        expect(stats).toHaveProperty('isRunning');
    });

    test('should reset statistics', () => {
        externalDataService.resetStats();
        const stats = externalDataService.getStats();
        
        expect(stats.imagesProcessed).toBe(0);
        expect(stats.radarUpdates).toBe(0);
        expect(stats.finesReceived).toBe(0);
        expect(stats.violationsReceived).toBe(0);
        expect(stats.errors).toBe(0);
    });
});
