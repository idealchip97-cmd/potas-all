const request = require('supertest');
const app = require('../server');
const { sequelize, User, Radar, Fine, ReportType, Report } = require('../models');

describe('Reports API', () => {
  let authToken;
  let adminUser;
  let testRadar;
  let testReportType;

  beforeAll(async () => {
    // Sync database for testing
    await sequelize.sync({ force: true });

    // Create test admin user
    adminUser = await User.create({
      email: 'test-admin@potasfactory.com',
      password: 'admin123',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin'
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/signin')
      .send({
        email: 'test-admin@potasfactory.com',
        password: 'admin123'
      });

    authToken = loginResponse.body.data.token;

    // Create test radar
    testRadar = await Radar.create({
      name: 'Test Radar',
      location: 'Test Location',
      serialNumber: 'TEST-001',
      speedLimit: 30,
      status: 'active'
    });

    // Create test report type
    testReportType = await ReportType.create({
      name: 'Test Report Type',
      description: 'Test report for unit testing',
      category: 'violation_summary',
      accessLevel: 'viewer',
      isActive: true
    });

    // Create test fines
    await Fine.bulkCreate([
      {
        radarId: testRadar.id,
        vehiclePlate: 'TEST123',
        speedDetected: 45,
        speedLimit: 30,
        violationAmount: 15,
        fineAmount: 150.00,
        violationDateTime: new Date(),
        status: 'pending'
      },
      {
        radarId: testRadar.id,
        vehiclePlate: 'TEST456',
        speedDetected: 50,
        speedLimit: 30,
        violationAmount: 20,
        fineAmount: 200.00,
        violationDateTime: new Date(),
        status: 'processed'
      }
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Dashboard Statistics', () => {
    test('GET /api/reports/dashboard should return dashboard stats', async () => {
      const response = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data.overview).toHaveProperty('totalRadars');
      expect(response.body.data.overview).toHaveProperty('totalFines');
      expect(response.body.data.overview.totalRadars).toBe(1);
      expect(response.body.data.overview.totalFines).toBe(2);
    });

    test('GET /api/reports/dashboard with date filter should work', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/reports/dashboard')
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Report Types Management', () => {
    test('GET /api/reports/types should return report types', async () => {
      const response = await request(app)
        .get('/api/reports/types')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reportTypes).toHaveLength(1);
      expect(response.body.data.reportTypes[0].name).toBe('Test Report Type');
    });

    test('POST /api/reports/types should create new report type', async () => {
      const newReportType = {
        name: 'New Test Report',
        description: 'Another test report',
        category: 'radar_performance',
        accessLevel: 'operator',
        templateConfig: {
          columns: ['radar', 'performance'],
          charts: ['bar']
        }
      };

      const response = await request(app)
        .post('/api/reports/types')
        .send(newReportType)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reportType.name).toBe(newReportType.name);
    });
  });

  describe('Report Generation', () => {
    test('POST /api/reports/generate should start report generation', async () => {
      const reportRequest = {
        reportTypeId: testReportType.id,
        title: 'Test Generated Report',
        description: 'Test report generation',
        parameters: {
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31'
          }
        }
      };

      const response = await request(app)
        .post('/api/reports/generate')
        .send(reportRequest)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.report.title).toBe(reportRequest.title);
      expect(response.body.data.report.status).toBe('generating');
    });

    test('GET /api/reports should return generated reports', async () => {
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toHaveLength(1);
      expect(response.body.data.pagination).toHaveProperty('total');
    });
  });

  describe('Violation Trends', () => {
    test('GET /api/reports/trends should return violation trends', async () => {
      const response = await request(app)
        .get('/api/reports/trends')
        .query({ period: 'daily', days: 7 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trends');
    });
  });

  describe('Radar Performance', () => {
    test('GET /api/reports/radar-performance should return radar performance data', async () => {
      const response = await request(app)
        .get('/api/reports/radar-performance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('performance');
    });
  });

  describe('Speed Analysis', () => {
    test('GET /api/reports/speed-analysis should return speed analysis', async () => {
      const response = await request(app)
        .get('/api/reports/speed-analysis')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('speedDistribution');
      expect(response.body.data).toHaveProperty('peakTimes');
    });
  });

  describe('Authentication Required', () => {
    test('Should return 401 without authentication token', async () => {
      const response = await request(app)
        .get('/api/reports/dashboard');

      expect(response.status).toBe(401);
    });

    test('Should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid report type ID', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          reportTypeId: 99999,
          title: 'Invalid Report'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Report type not found');
    });

    test('Should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({})
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
