const { sequelize, User, Radar, Fine, ReportType, Report, ReportSchedule, ReportData, AuditLog, SystemMetric } = require('../models');

const seedComprehensiveData = async () => {
  try {
    // Sync database
    await sequelize.sync({ force: true });
    console.log('Database synced successfully');

    // Create users with diverse roles and scenarios
    const users = await User.bulkCreate([
      {
        email: 'admin@potasfactory.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        lastLogin: new Date()
      },
      {
        email: 'operator1@potasfactory.com',
        password: 'operator123',
        firstName: 'John',
        lastName: 'Operator',
        role: 'operator',
        isActive: true,
        lastLogin: new Date(Date.now() - 86400000)
      },
      {
        email: 'operator2@potasfactory.com',
        password: 'operator123',
        firstName: 'Sarah',
        lastName: 'Controller',
        role: 'operator',
        isActive: true,
        lastLogin: new Date(Date.now() - 172800000)
      },
      {
        email: 'viewer@potasfactory.com',
        password: 'viewer123',
        firstName: 'Jane',
        lastName: 'Viewer',
        role: 'viewer',
        isActive: true,
        lastLogin: new Date(Date.now() - 3600000)
      },
      {
        email: 'inactive@potasfactory.com',
        password: 'inactive123',
        firstName: 'Inactive',
        lastName: 'User',
        role: 'viewer',
        isActive: false,
        lastLogin: new Date(Date.now() - 2592000000)
      }
    ]);

    console.log('Users created successfully');

    // Create comprehensive radar network
    const radars = await Radar.bulkCreate([
      {
        name: 'Main Gate Radar',
        location: 'Factory Main Entrance',
        serialNumber: 'RDR-001-MG',
        speedLimit: 30,
        status: 'active',
        latitude: 40.7128,
        longitude: -74.0060,
        installationDate: new Date('2023-01-15'),
        lastMaintenance: new Date('2024-01-15'),
        ftpPath: '/ftp/radar001',
        ipAddress: '192.168.1.101'
      },
      {
        name: 'Production Area A Radar',
        location: 'Production Zone A',
        serialNumber: 'RDR-002-PA',
        speedLimit: 20,
        status: 'active',
        latitude: 40.7130,
        longitude: -74.0062,
        installationDate: new Date('2023-02-01'),
        lastMaintenance: new Date('2024-02-01'),
        ftpPath: '/ftp/radar002',
        ipAddress: '192.168.1.102'
      },
      {
        name: 'Production Area B Radar',
        location: 'Production Zone B',
        serialNumber: 'RDR-003-PB',
        speedLimit: 20,
        status: 'active',
        latitude: 40.7131,
        longitude: -74.0063,
        installationDate: new Date('2023-02-15'),
        lastMaintenance: new Date('2024-02-15'),
        ftpPath: '/ftp/radar003',
        ipAddress: '192.168.1.103'
      },
      {
        name: 'Warehouse District Radar',
        location: 'Warehouse District',
        serialNumber: 'RDR-004-WH',
        speedLimit: 25,
        status: 'active',
        latitude: 40.7125,
        longitude: -74.0058,
        installationDate: new Date('2023-03-10'),
        lastMaintenance: new Date('2024-03-10'),
        ftpPath: '/ftp/radar004',
        ipAddress: '192.168.1.104'
      },
      {
        name: 'Loading Dock Radar',
        location: 'Loading Dock Area',
        serialNumber: 'RDR-005-LD',
        speedLimit: 15,
        status: 'maintenance',
        latitude: 40.7132,
        longitude: -74.0055,
        installationDate: new Date('2023-04-20'),
        lastMaintenance: new Date('2024-04-20'),
        ftpPath: '/ftp/radar005',
        ipAddress: '192.168.1.105'
      },
      {
        name: 'Emergency Exit Radar',
        location: 'Emergency Exit Route',
        serialNumber: 'RDR-006-EE',
        speedLimit: 40,
        status: 'inactive',
        latitude: 40.7120,
        longitude: -74.0065,
        installationDate: new Date('2023-05-05'),
        lastMaintenance: new Date('2024-05-05'),
        ftpPath: '/ftp/radar006',
        ipAddress: '192.168.1.106'
      },
      {
        name: 'Parking Area Radar',
        location: 'Employee Parking',
        serialNumber: 'RDR-007-PA',
        speedLimit: 10,
        status: 'active',
        latitude: 40.7118,
        longitude: -74.0070,
        installationDate: new Date('2023-06-01'),
        lastMaintenance: new Date('2024-06-01'),
        ftpPath: '/ftp/radar007',
        ipAddress: '192.168.1.107'
      },
      {
        name: 'Quality Control Radar',
        location: 'Quality Control Area',
        serialNumber: 'RDR-008-QC',
        speedLimit: 15,
        status: 'error',
        latitude: 40.7135,
        longitude: -74.0050,
        installationDate: new Date('2023-07-15'),
        lastMaintenance: new Date('2024-07-15'),
        ftpPath: '/ftp/radar008',
        ipAddress: '192.168.1.108'
      }
    ]);

    console.log('Radars created successfully');

    // Generate extensive fine data (1500+ records over 6 months)
    const fines = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 180); // 6 months of data

    const vehiclePlates = [
      'ABC123', 'XYZ789', 'DEF456', 'GHI012', 'JKL345', 'MNO678', 'PQR901', 'STU234', 'VWX567', 'YZA890',
      'BCD123', 'EFG456', 'HIJ789', 'KLM012', 'NOP345', 'QRS678', 'TUV901', 'WXY234', 'ZAB567', 'CDE890',
      'FGH123', 'IJK456', 'LMN789', 'OPQ012', 'RST345', 'UVW678', 'XYZ901', 'ABC234', 'DEF567', 'GHI890'
    ];

    const statuses = ['pending', 'processed', 'paid', 'cancelled'];
    const statusWeights = [0.3, 0.4, 0.25, 0.05]; // Distribution of statuses

    for (let i = 0; i < 1500; i++) {
      const radar = radars[Math.floor(Math.random() * radars.length)];
      const violationDate = new Date(startDate.getTime() + Math.random() * (Date.now() - startDate.getTime()));
      
      // Create realistic speed patterns
      let speedDetected;
      if (Math.random() < 0.6) {
        // Minor violations (5-15 km/h over)
        speedDetected = radar.speedLimit + Math.floor(Math.random() * 10) + 5;
      } else if (Math.random() < 0.9) {
        // Moderate violations (15-30 km/h over)
        speedDetected = radar.speedLimit + Math.floor(Math.random() * 15) + 15;
      } else {
        // Severe violations (30+ km/h over)
        speedDetected = radar.speedLimit + Math.floor(Math.random() * 30) + 30;
      }

      const violationAmount = speedDetected - radar.speedLimit;
      
      // Calculate fine amount based on violation severity
      let fineAmount = 0;
      if (violationAmount <= 10) fineAmount = 50 + Math.random() * 25;
      else if (violationAmount <= 20) fineAmount = 100 + Math.random() * 50;
      else if (violationAmount <= 30) fineAmount = 200 + Math.random() * 100;
      else fineAmount = 500 + Math.random() * 300;

      // Select status based on weights
      let statusIndex = 0;
      const rand = Math.random();
      let cumulative = 0;
      for (let j = 0; j < statusWeights.length; j++) {
        cumulative += statusWeights[j];
        if (rand <= cumulative) {
          statusIndex = j;
          break;
        }
      }

      fines.push({
        radarId: radar.id,
        vehiclePlate: Math.random() > 0.05 ? vehiclePlates[Math.floor(Math.random() * vehiclePlates.length)] : null,
        speedDetected,
        speedLimit: radar.speedLimit,
        violationAmount,
        fineAmount: Math.round(fineAmount * 100) / 100,
        violationDateTime: violationDate,
        status: statuses[statusIndex],
        imageUrl: Math.random() > 0.2 ? `https://images.potasfactory.com/violations/${Date.now()}_${i}.jpg` : null,
        notes: Math.random() > 0.8 ? ['Automatic detection', 'Manual review required', 'Weather conditions poor', 'Emergency vehicle'][Math.floor(Math.random() * 4)] : null,
        processedBy: Math.random() > 0.4 ? users[Math.floor(Math.random() * 3) + 1].id : null,
        processedAt: Math.random() > 0.4 ? new Date(violationDate.getTime() + Math.random() * 86400000 * 7) : null
      });
    }

    await Fine.bulkCreate(fines);
    console.log('Fines created successfully');

    console.log(`Database seeded successfully! Created ${users.length} users, ${radars.length} radars, and ${fines.length} fines`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

module.exports = seedComprehensiveData;
