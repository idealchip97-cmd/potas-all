const { sequelize, Violation, Radar, User } = require('./models');

const createTestData = async () => {
  try {
    console.log('🔧 Creating test violation data...');
    
    // Ensure database is connected
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Create some test violations
    const testViolations = [
      {
        plateNumber: 'ABC123',
        imageUrl: '/static/plate-images/camera001/violation_001.jpg',
        originalFileName: 'violation_001.jpg',
        processingMethod: 'automatic',
        confidence: 95.5,
        vehicleInfo: 'Red Sedan',
        cameraId: 'camera001',
        location: 'Main Street Intersection',
        speed: 70,
        speedLimit: 50,
        violationType: 'speeding',
        timestamp: new Date(),
        confirmed: true,
        status: 'processed',
        fineAmount: 150.00,
        notes: 'Clear violation - 20 km/h over limit'
      },
      {
        plateNumber: 'XYZ789',
        imageUrl: '/static/plate-images/camera002/violation_002.jpg',
        originalFileName: 'violation_002.jpg',
        processingMethod: 'automatic',
        confidence: 88.3,
        vehicleInfo: 'Blue SUV',
        cameraId: 'camera002',
        location: 'Highway Exit 15',
        speed: 85,
        speedLimit: 60,
        violationType: 'speeding',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        confirmed: true,
        status: 'processed',
        fineAmount: 200.00,
        notes: 'Severe violation - 25 km/h over limit'
      },
      {
        plateNumber: 'DEF456',
        imageUrl: '/static/plate-images/camera001/violation_003.jpg',
        originalFileName: 'violation_003.jpg',
        processingMethod: 'manual',
        confidence: 75.0,
        vehicleInfo: 'White Truck',
        cameraId: 'camera001',
        location: 'Industrial Zone Gate',
        speed: 45,
        speedLimit: 30,
        violationType: 'speeding',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        confirmed: false,
        status: 'under_review',
        fineAmount: 100.00,
        notes: 'Needs manual verification'
      },
      {
        plateNumber: 'GHI789',
        imageUrl: '/static/plate-images/camera003/violation_004.jpg',
        originalFileName: 'violation_004.jpg',
        processingMethod: 'automatic',
        confidence: 92.1,
        vehicleInfo: 'Black Motorcycle',
        cameraId: 'camera003',
        location: 'School Zone',
        speed: 55,
        speedLimit: 25,
        violationType: 'speeding',
        timestamp: new Date(Date.now() - 10800000), // 3 hours ago
        confirmed: true,
        status: 'processed',
        fineAmount: 300.00,
        notes: 'Severe violation in school zone'
      },
      {
        plateNumber: 'JKL012',
        imageUrl: '/static/plate-images/camera002/violation_005.jpg',
        originalFileName: 'violation_005.jpg',
        processingMethod: 'automatic',
        confidence: 97.8,
        vehicleInfo: 'Silver Hatchback',
        cameraId: 'camera002',
        location: 'City Center',
        speed: 65,
        speedLimit: 50,
        violationType: 'speeding',
        timestamp: new Date(Date.now() - 14400000), // 4 hours ago
        confirmed: true,
        status: 'processed',
        fineAmount: 120.00,
        notes: 'Minor violation'
      }
    ];
    
    // Create violations
    const createdViolations = await Violation.bulkCreate(testViolations);
    console.log(`✅ Created ${createdViolations.length} test violations`);
    
    // Display summary
    console.log('\n📊 Test Data Summary:');
    console.log(`   • Total violations: ${createdViolations.length}`);
    console.log(`   • Cameras: camera001, camera002, camera003`);
    console.log(`   • Violation types: speeding`);
    console.log(`   • Status mix: processed, under_review`);
    
    console.log('\n🎯 Test data created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  createTestData().catch(console.error);
}

module.exports = createTestData;
