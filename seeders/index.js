const { sequelize, User, Radar, Fine } = require('../models');
require('dotenv').config();

const seedUsers = async () => {
  const users = [
    {
      email: 'admin@potasfactory.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    },
    {
      email: 'operator@potasfactory.com',
      password: 'operator123',
      firstName: 'John',
      lastName: 'Operator',
      role: 'operator'
    },
    {
      email: 'viewer@potasfactory.com',
      password: 'viewer123',
      firstName: 'Jane',
      lastName: 'Viewer',
      role: 'viewer'
    }
  ];

  for (const userData of users) {
    await User.findOrCreate({
      where: { email: userData.email },
      defaults: userData
    });
  }
  console.log('✅ Users seeded successfully');
};

const seedRadars = async () => {
  const radars = [
    {
      name: 'Main Gate Radar',
      location: 'Factory Main Entrance',
      ipAddress: '192.168.1.101',
      serialNumber: 'RDR-001-MG',
      speedLimit: 30,
      status: 'active',
      latitude: 31.2001,
      longitude: 29.9187,
      installationDate: new Date('2024-01-15'),
      ftpPath: '/radar/main-gate'
    },
    {
      name: 'Production Area Radar',
      location: 'Production Building A',
      ipAddress: '192.168.1.102',
      serialNumber: 'RDR-002-PA',
      speedLimit: 20,
      status: 'active',
      latitude: 31.2010,
      longitude: 29.9195,
      installationDate: new Date('2024-02-01'),
      ftpPath: '/radar/production-a'
    },
    {
      name: 'Warehouse Radar',
      location: 'Warehouse Complex',
      ipAddress: '192.168.1.103',
      serialNumber: 'RDR-003-WH',
      speedLimit: 25,
      status: 'active',
      latitude: 31.1995,
      longitude: 29.9180,
      installationDate: new Date('2024-01-20'),
      ftpPath: '/radar/warehouse'
    },
    {
      name: 'Loading Dock Radar',
      location: 'Loading Dock Area',
      ipAddress: '192.168.1.104',
      serialNumber: 'RDR-004-LD',
      speedLimit: 15,
      status: 'maintenance',
      latitude: 31.1990,
      longitude: 29.9175,
      installationDate: new Date('2024-02-10'),
      ftpPath: '/radar/loading-dock'
    },
    {
      name: 'Emergency Exit Radar',
      location: 'Emergency Exit Route',
      ipAddress: '192.168.1.105',
      serialNumber: 'RDR-005-EE',
      speedLimit: 40,
      status: 'active',
      latitude: 31.2005,
      longitude: 29.9170,
      installationDate: new Date('2024-01-25'),
      ftpPath: '/radar/emergency-exit'
    }
  ];

  for (const radarData of radars) {
    await Radar.findOrCreate({
      where: { serialNumber: radarData.serialNumber },
      defaults: radarData
    });
  }
  console.log('✅ Radars seeded successfully');
};

const seedFines = async () => {
  const radars = await Radar.findAll();
  const users = await User.findAll();
  
  const fines = [];
  const now = new Date();
  
  // Generate demo fines for the last 30 days
  for (let i = 0; i < 50; i++) {
    const randomRadar = radars[Math.floor(Math.random() * radars.length)];
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const violationDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    // Add some random hours and minutes
    violationDate.setHours(Math.floor(Math.random() * 24));
    violationDate.setMinutes(Math.floor(Math.random() * 60));
    
    const speedDetected = randomRadar.speedLimit + Math.floor(Math.random() * 30) + 5; // 5-35 km/h over limit
    const violationAmount = speedDetected - randomRadar.speedLimit;
    const fineAmount = violationAmount * 10; // 10 currency units per km/h over limit
    
    const plateNumbers = ['ABC123', 'XYZ789', 'DEF456', 'GHI012', 'JKL345', 'MNO678', 'PQR901'];
    const statuses = ['pending', 'processed', 'paid', 'cancelled'];
    
    fines.push({
      radarId: randomRadar.id,
      vehiclePlate: plateNumbers[Math.floor(Math.random() * plateNumbers.length)],
      speedDetected,
      speedLimit: randomRadar.speedLimit,
      violationAmount,
      fineAmount,
      violationDateTime: violationDate,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      imageUrl: `https://example.com/violations/img_${i + 1}.jpg`,
      notes: i % 5 === 0 ? 'Severe violation - multiple offenses' : null,
      processedBy: Math.random() > 0.3 ? randomUser.id : null,
      processedAt: Math.random() > 0.3 ? new Date(violationDate.getTime() + (Math.random() * 24 * 60 * 60 * 1000)) : null
    });
  }

  await Fine.bulkCreate(fines);
  console.log('✅ Fines seeded successfully');
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('📊 Database connection established');
    
    // Sync database
    await sequelize.sync({ force: false });
    console.log('🔄 Database synchronized');
    
    // Seed data
    await seedUsers();
    await seedRadars();
    await seedFines();
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('Admin: admin@potasfactory.com / admin123');
    console.log('Operator: operator@potasfactory.com / operator123');
    console.log('Viewer: viewer@potasfactory.com / viewer123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await sequelize.close();
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
