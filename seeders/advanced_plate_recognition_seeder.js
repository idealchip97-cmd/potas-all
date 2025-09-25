const { Car, Violation, PlateRecognition, User, Radar } = require('../models');

const advancedPlateRecognitionSeeder = async () => {
  try {
    console.log('🚗 Starting Advanced Plate Recognition Seeder...');

    // Get existing users and radars for associations
    const users = await User.findAll();
    const radars = await Radar.findAll();

    if (users.length === 0 || radars.length === 0) {
      console.log('❌ No users or radars found. Please run basic seeders first.');
      return;
    }

    // Sample plate recognition data
    const plateRecognitionData = [
      {
        filename: 'car_001.jpg',
        filepath: '/uploads/plates/car_001.jpg',
        plateNumber: 'ABC123',
        confidence: 95.5,
        status: 'success',
        ocrEngine: 'chatgpt-vision',
        processingTime: 2500,
        processingMethod: 'enhanced',
        detectionId: 'enhanced_1703123456_abc123def',
        vehicleColor: 'Red',
        vehicleType: 'Sedan',
        location: 'Main Gate',
        allResults: [
          { engine: 'chatgpt-vision', plateNumber: 'ABC123', confidence: 95.5 },
          { engine: 'tesseract', plateNumber: 'ABC123', confidence: 87.2 }
        ],
        metadata: {
          engines: ['chatgpt-vision', 'tesseract'],
          processingTime: 2500,
          originalEngine: 'enhanced',
          fallbackUsed: false
        }
      },
      {
        filename: 'car_002.jpg',
        filepath: '/uploads/plates/car_002.jpg',
        plateNumber: 'XYZ789',
        confidence: 88.3,
        status: 'success',
        ocrEngine: 'enhanced-vision',
        processingTime: 3200,
        processingMethod: 'enhanced',
        detectionId: 'enhanced_1703123457_xyz789ghi',
        vehicleColor: 'Blue',
        vehicleType: 'SUV',
        location: 'Parking Area A',
        allResults: [
          { engine: 'chatgpt-vision', plateNumber: 'XYZ789', confidence: 88.3 },
          { engine: 'tesseract', plateNumber: 'XYZ789', confidence: 82.1 }
        ],
        metadata: {
          engines: ['chatgpt-vision', 'tesseract'],
          processingTime: 3200,
          originalEngine: 'enhanced',
          fallbackUsed: false
        }
      },
      {
        filename: 'car_003.jpg',
        filepath: '/uploads/plates/car_003.jpg',
        plateNumber: 'DEF456',
        confidence: 92.7,
        status: 'success',
        ocrEngine: 'tesseract',
        processingTime: 4100,
        processingMethod: 'tesseract',
        detectionId: 'tesseract_1703123458_def456jkl',
        vehicleColor: 'White',
        vehicleType: 'Truck',
        location: 'Loading Dock',
        allResults: [
          { engine: 'tesseract', plateNumber: 'DEF456', confidence: 92.7 }
        ],
        metadata: {
          engines: ['tesseract'],
          processingTime: 4100,
          originalEngine: 'tesseract',
          fallbackUsed: false
        }
      },
      {
        filename: 'car_004.jpg',
        filepath: '/uploads/plates/car_004.jpg',
        plateNumber: 'GHI789',
        confidence: 76.2,
        status: 'success',
        ocrEngine: 'mock',
        processingTime: 1800,
        processingMethod: 'enhanced',
        detectionId: 'enhanced_1703123459_ghi789mno',
        vehicleColor: 'Black',
        vehicleType: 'Van',
        location: 'Service Area',
        allResults: [
          { engine: 'mock', plateNumber: 'GHI789', confidence: 76.2 }
        ],
        metadata: {
          engines: ['mock'],
          processingTime: 1800,
          originalEngine: 'enhanced',
          fallbackUsed: true
        }
      },
      {
        filename: 'car_005.jpg',
        filepath: '/uploads/plates/car_005.jpg',
        plateNumber: '',
        confidence: 45.1,
        status: 'failed',
        ocrEngine: 'enhanced-vision',
        processingTime: 5200,
        processingMethod: 'enhanced',
        detectionId: 'enhanced_1703123460_failed001',
        errorMessage: 'No clear plate visible in image',
        location: 'Entrance Gate',
        allResults: [
          { engine: 'chatgpt-vision', plateNumber: 'NOT_FOUND', confidence: 0 },
          { engine: 'tesseract', plateNumber: '', confidence: 45.1 }
        ],
        metadata: {
          engines: ['chatgpt-vision', 'tesseract'],
          processingTime: 5200,
          originalEngine: 'enhanced',
          fallbackUsed: false,
          error: 'No clear plate visible in image'
        }
      }
    ];

    // Create plate recognition records
    const plateRecords = [];
    for (const data of plateRecognitionData) {
      const user = users[Math.floor(Math.random() * users.length)];
      const plateRecord = await PlateRecognition.create({
        ...data,
        processedBy: user.id,
        imageUrl: `/uploads/plates/${data.filename}`
      });
      plateRecords.push(plateRecord);
      console.log(`✅ Created plate recognition record: ${data.filename} - ${data.plateNumber || 'FAILED'}`);
    }

    // Sample car data
    const carData = [
      {
        plateNumber: 'ABC123',
        color: 'Red',
        type: 'Sedan',
        confidence: 95.5,
        location: 'Main Gate',
        speed: 45,
        direction: 'North',
        processingEngine: 'chatgpt-vision',
        cameraInfo: 'Main Gate Camera 1 - 4K Resolution',
        detectionId: 'optimized_1703123456_car001'
      },
      {
        plateNumber: 'XYZ789',
        color: 'Blue',
        type: 'SUV',
        confidence: 88.3,
        location: 'Parking Area A',
        speed: 25,
        direction: 'East',
        processingEngine: 'enhanced-vision',
        cameraInfo: 'Parking Camera 2 - HD Resolution',
        detectionId: 'optimized_1703123457_car002'
      },
      {
        plateNumber: 'DEF456',
        color: 'White',
        type: 'Truck',
        confidence: 92.7,
        location: 'Loading Dock',
        speed: 15,
        direction: 'South',
        processingEngine: 'tesseract',
        cameraInfo: 'Loading Dock Camera - Industrial Grade',
        detectionId: 'optimized_1703123458_car003'
      },
      {
        plateNumber: 'GHI789',
        color: 'Black',
        type: 'Van',
        confidence: 76.2,
        location: 'Service Area',
        speed: 35,
        direction: 'West',
        processingEngine: 'mock',
        cameraInfo: 'Service Area Camera - Standard Resolution',
        detectionId: 'optimized_1703123459_car004'
      },
      {
        plateNumber: 'JKL012',
        color: 'Silver',
        type: 'Motorcycle',
        confidence: 89.1,
        location: 'Employee Parking',
        speed: 20,
        direction: 'North',
        processingEngine: 'chatgpt-vision',
        cameraInfo: 'Employee Parking Camera - Wide Angle',
        detectionId: 'optimized_1703123461_car005'
      }
    ];

    // Create car records
    const cars = [];
    for (let i = 0; i < carData.length; i++) {
      const data = carData[i];
      const plateRecord = plateRecords[i] || plateRecords[0]; // Associate with plate recognition
      
      const car = await Car.create({
        ...data,
        imageUrl: `/uploads/cars/car_${String(i + 1).padStart(3, '0')}.jpg`,
        imagePath: `/uploads/cars/car_${String(i + 1).padStart(3, '0')}.jpg`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
        plateRecognitionId: plateRecord.id,
        metadata: {
          originalFilename: `car_${String(i + 1).padStart(3, '0')}.jpg`,
          processingTime: 2000 + Math.random() * 3000,
          engines: data.processingEngine === 'enhanced-vision' ? ['chatgpt-vision', 'tesseract'] : [data.processingEngine]
        }
      });
      cars.push(car);
      console.log(`🚗 Created car record: ${data.plateNumber} - ${data.color} ${data.type}`);
    }

    // Sample violation data
    const violationData = [
      {
        plateNumber: 'ABC123',
        violationType: 'speeding',
        speed: 65,
        speedLimit: 50,
        location: 'Main Gate',
        confidence: 95.5,
        processingMethod: 'ai-enhanced',
        vehicleInfo: 'Red Sedan',
        cameraId: 'CAM_MAIN_001',
        notes: 'Clear speeding violation detected by AI',
        confirmed: true,
        status: 'confirmed'
      },
      {
        plateNumber: 'XYZ789',
        violationType: 'unauthorized_access',
        location: 'Restricted Area B',
        confidence: 88.3,
        processingMethod: 'ai-enhanced',
        vehicleInfo: 'Blue SUV',
        cameraId: 'CAM_RESTRICTED_002',
        notes: 'Vehicle entered restricted area without authorization',
        confirmed: false,
        status: 'pending'
      },
      {
        plateNumber: 'DEF456',
        violationType: 'illegal_parking',
        location: 'Fire Lane',
        confidence: 92.7,
        processingMethod: 'manual',
        vehicleInfo: 'White Truck',
        cameraId: 'CAM_PARKING_003',
        notes: 'Truck parked in designated fire lane',
        confirmed: true,
        status: 'processed'
      },
      {
        plateNumber: 'GHI789',
        violationType: 'speeding',
        speed: 75,
        speedLimit: 60,
        location: 'Service Road',
        confidence: 76.2,
        processingMethod: 'ai-enhanced',
        vehicleInfo: 'Black Van',
        cameraId: 'CAM_SERVICE_004',
        notes: 'Moderate speeding violation',
        confirmed: false,
        status: 'under_review'
      },
      {
        plateNumber: 'JKL012',
        violationType: 'wrong_direction',
        location: 'One Way Street',
        confidence: 89.1,
        processingMethod: 'ai-enhanced',
        vehicleInfo: 'Silver Motorcycle',
        cameraId: 'CAM_ONEWAY_005',
        notes: 'Motorcycle traveling against traffic flow',
        confirmed: true,
        status: 'confirmed'
      }
    ];

    // Create violation records
    for (let i = 0; i < violationData.length; i++) {
      const data = violationData[i];
      const car = cars[i];
      const radar = radars[Math.floor(Math.random() * radars.length)];
      const reviewer = data.confirmed ? users[Math.floor(Math.random() * users.length)] : null;

      // Calculate fine amount
      let fineAmount = 100; // Base fine
      if (data.violationType === 'speeding' && data.speed && data.speedLimit) {
        const speedOver = data.speed - data.speedLimit;
        fineAmount += speedOver * 10;
        if (speedOver > 20) fineAmount *= 1.5;
      } else if (data.violationType === 'unauthorized_access') {
        fineAmount = 300;
      } else if (data.violationType === 'illegal_parking') {
        fineAmount = 50;
      } else if (data.violationType === 'wrong_direction') {
        fineAmount = 150;
      }

      const violation = await Violation.create({
        ...data,
        imageUrl: `/uploads/violations/violation_${String(i + 1).padStart(3, '0')}.jpg`,
        originalFileName: `violation_${String(i + 1).padStart(3, '0')}.jpg`,
        fineAmount: parseFloat(fineAmount.toFixed(2)),
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
        carId: car.id,
        radarId: radar.id,
        reviewedBy: reviewer?.id || null,
        reviewedAt: reviewer ? new Date() : null,
        metadata: {
          detectionMethod: data.processingMethod,
          confidence: data.confidence,
          cameraId: data.cameraId,
          autoDetected: data.processingMethod === 'ai-enhanced'
        }
      });

      console.log(`🚨 Created violation: ${data.plateNumber} - ${data.violationType} - $${fineAmount}`);
    }

    console.log('✅ Advanced Plate Recognition Seeder completed successfully!');
    console.log(`📊 Created: ${plateRecords.length} plate recognitions, ${cars.length} cars, ${violationData.length} violations`);

  } catch (error) {
    console.error('❌ Error in Advanced Plate Recognition Seeder:', error);
    throw error;
  }
};

module.exports = advancedPlateRecognitionSeeder;
