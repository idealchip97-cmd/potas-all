const comprehensiveSeeder = require('./comprehensive_seeder');
const reportSeeder = require('./report_seeder');

const seedDatabase = async () => {
  try {
    console.log('Starting comprehensive database seeding...');
    
    // Run comprehensive seeder first (creates base data)
    await comprehensiveSeeder();
    
    // Then run report seeder (creates reporting data)
    await reportSeeder();
    
    console.log('All seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

module.exports = seedDatabase;
