const path = require('path');

// Import backend models
const backendPath = path.join(__dirname, '..', 'potassium-backend-');
const { Radar } = require(path.join(backendPath, 'models'));
const sequelize = require(path.join(backendPath, 'config', 'database'));

// 12 Radar configurations for the factory
const radarConfigurations = [
  {
    id: 1,
    name: 'Radar001',
    location: 'Main Gate Entry',
    ipAddress: '192.168.1.54',
    serialNumber: 'RDR001-2024',
    speedLimit: 30,
    status: 'active',
    latitude: 31.2001,
    longitude: 29.9187,
    installationDate: '2024-01-15',
    lastMaintenance: '2024-09-01',
    ftpPath: '/camera_uploads/camera001/192.168.1.54'
  },
  {
    id: 2,
    name: 'Radar002',
    location: 'Production Area A',
    ipAddress: '192.168.1.55',
    serialNumber: 'RDR002-2024',
    speedLimit: 30,
    status: 'inactive',
    latitude: 31.2002,
    longitude: 29.9188,
    installationDate: '2024-01-16',
    lastMaintenance: '2024-08-15',
    ftpPath: '/camera_uploads/camera002/192.168.1.55'
  },
  {
    id: 3,
    name: 'Radar003',
    location: 'Warehouse Zone',
    ipAddress: '192.168.1.56',
    serialNumber: 'RDR003-2024',
    speedLimit: 30,
    status: 'inactive',
    latitude: 31.2003,
    longitude: 29.9189,
    installationDate: '2024-01-17',
    lastMaintenance: '2024-08-20',
    ftpPath: '/camera_uploads/camera003/192.168.1.56'
  },
  {
    id: 4,
    name: 'Radar004',
    location: 'Loading Dock',
    ipAddress: '192.168.1.57',
    serialNumber: 'RDR004-2024',
    speedLimit: 30,
    status: 'inactive',
    latitude: 31.2004,
    longitude: 29.9190,
    installationDate: '2024-01-18',
    lastMaintenance: '2024-08-25',
    ftpPath: '/camera_uploads/camera004/192.168.1.57'
  },
  {
    id: 5,
    name: 'Radar005',
    location: 'Production Area B',
    ipAddress: '192.168.1.58',
    serialNumber: 'RDR005-2024',
    speedLimit: 30,
    status: 'inactive',
    latitude: 31.2005,
    longitude: 29.9191,
    installationDate: '2024-01-19',
    lastMaintenance: '2024-09-05',
    ftpPath: '/camera_uploads/camera005/192.168.1.58'
  },
  {
    id: 6,
    name: 'Radar006',
    location: 'Quality Control Area',
    ipAddress: '192.168.1.59',
    serialNumber: 'RDR006-2024',
    speedLimit: 30,
    status: 'inactive',
    latitude: 31.2006,
    longitude: 29.9192,
    installationDate: '2024-01-20',
    lastMaintenance: '2024-09-10',
    ftpPath: '/camera_uploads/camera006/192.168.1.59'
  },
  {
    id: 7,
    name: 'Radar007',
    location: 'Packaging Area',
    ipAddress: '192.168.1.60',
    serialNumber: 'RDR007-2024',
    speedLimit: 30,
    status: 'inactive',
    latitude: 31.2007,
    longitude: 29.9193,
    installationDate: '2024-01-21',
    lastMaintenance: '2024-09-15',
    ftpPath: '/camera_uploads/camera007/192.168.1.60'
  },
  {
    id: 8,
    name: 'Radar008',
    location: 'Storage Area',
    ipAddress: '192.168.1.61',
    serialNumber: 'RDR008-2024',
    speedLimit: 30,
    status: 'inactive',
    latitude: 31.2008,
    longitude: 29.9194,
    installationDate: '2024-01-22',
    lastMaintenance: '2024-09-20',
    ftpPath: '/camera_uploads/camera008/192.168.1.61'
  },
  {
    id: 9,
    name: 'Radar009',
    location: 'Maintenance Area',
    ipAddress: '192.168.1.62',
    serialNumber: 'RDR009-2024',
    speedLimit: 30,
    status: 'inactive',
    latitude: 31.2009,
    longitude: 29.9195,
    installationDate: '2024-01-23',
    lastMaintenance: '2024-09-25',
    ftpPath: '/camera_uploads/camera009/192.168.1.62'
  },
  {
    id: 10,
    name: 'Radar010',
    location: 'Office Complex',
    ipAddress: '192.168.1.63',
    serialNumber: 'RDR010-2024',
    speedLimit: 30,
    status: 'inactive',
    latitude: 31.2010,
    longitude: 29.9196,
    installationDate: '2024-01-24',
    lastMaintenance: '2024-09-30',
    ftpPath: '/camera_uploads/camera010/192.168.1.63'
  },
  {
    id: 11,
    name: 'Radar011',
    location: 'Emergency Exit',
    ipAddress: '192.168.1.64',
    serialNumber: 'RDR011-2024',
    speedLimit: 30,
    status: 'inactive',
    latitude: 31.2011,
    longitude: 29.9197,
    installationDate: '2024-01-25',
    lastMaintenance: '2024-08-30',
    ftpPath: '/camera_uploads/camera011/192.168.1.64'
  },
  {
    id: 12,
    name: 'Radar012',
    location: 'Secondary Gate',
    ipAddress: '192.168.1.65',
    serialNumber: 'RDR012-2024',
    speedLimit: 30,
    status: 'inactive',
    latitude: 31.2012,
    longitude: 29.9198,
    installationDate: '2024-01-26',
    lastMaintenance: '2024-08-28',
    ftpPath: '/camera_uploads/camera012/192.168.1.65'
  }
];

async function setupRadars() {
  try {
    console.log('🎯 Setting up 12 radar configurations...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync models
    await sequelize.sync();
    console.log('✅ Models synchronized');

    // Clear existing radars and insert new ones
    await Radar.destroy({ where: {} });
    console.log('🧹 Cleared existing radar data');

    // Insert all 12 radars
    for (const radarConfig of radarConfigurations) {
      await Radar.create(radarConfig);
      console.log(`✅ Created ${radarConfig.name} - ${radarConfig.location} (${radarConfig.status})`);
    }

    console.log('');
    console.log('🎯 Radar System Setup Complete!');
    console.log('================================');
    console.log('📡 Total Radars: 12');
    console.log('🟢 Active: Radar001 (Main Gate Entry)');
    console.log('🔴 Inactive: Radar002-012 (Ready for activation)');
    console.log('⚡ Speed Limit: 30 km/h (all radars)');
    console.log('📷 Camera Integration: Each radar has dedicated camera');
    console.log('');
    console.log('🌐 View radars at: http://localhost:3004/radars');
    console.log('📊 Monitor active radar: http://localhost:3004/radar-info-monitor');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up radars:', error);
    process.exit(1);
  }
}

setupRadars();
