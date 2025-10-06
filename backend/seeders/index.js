const comprehensiveSeeder = require('./comprehensive_seeder');
const reportSeeder = require('./report_seeder');
const advancedPlateRecognitionSeeder = require('./advanced_plate_recognition_seeder');

const seedDatabase = async () => {
  try {
    console.log('Starting comprehensive database seeding...');
    
    // Run comprehensive seeder first (creates base data)
    await comprehensiveSeeder();
    
    // Then run report seeder (creates reporting data)
    await reportSeeder();
    
    // Finally run advanced plate recognition seeder (creates AI-enhanced data)
    await advancedPlateRecognitionSeeder();
    
    console.log('All seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

module.exports = seedDatabase;
