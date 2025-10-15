const { Fine, PlateRecognition, Radar, UdpReading, RadarReading } = require('../models');
const { Op } = require('sequelize');

class PlateRecognitionToFinesSync {
    constructor() {
        this.syncTimeWindow = 5; // 5 seconds window for correlation
    }

    /**
     * Sync plate recognition data with existing fines
     * Correlates based on timestamp proximity and radar location
     */
    async syncPlateRecognitionWithFines() {
        try {
            console.log('Starting plate recognition to fines sync...');

            // Get all fines without plate numbers
            const finesWithoutPlates = await Fine.findAll({
                where: {
                    vehiclePlate: {
                        [Op.or]: [null, '']
                    }
                },
                order: [['violationDateTime', 'DESC']],
                limit: 100 // Process in batches
            });

            console.log(`Found ${finesWithoutPlates.length} fines without plate numbers`);

            let syncedCount = 0;
            const syncResults = [];

            for (const fine of finesWithoutPlates) {
                try {
                    const plateData = await this.findCorrelatedPlateRecognition(fine);
                    
                    if (plateData) {
                        await fine.update({
                            vehiclePlate: plateData.plateNumber,
                            notes: fine.notes ? 
                                `${fine.notes} | Plate: ${plateData.plateNumber} (Confidence: ${plateData.confidence}%)` :
                                `Plate: ${plateData.plateNumber} (Confidence: ${plateData.confidence}%)`
                        });

                        syncedCount++;
                        syncResults.push({
                            fineId: fine.id,
                            plateNumber: plateData.plateNumber,
                            confidence: plateData.confidence,
                            correlationMethod: plateData.correlationMethod
                        });

                        console.log(`Synced fine ${fine.id} with plate ${plateData.plateNumber}`);
                    }
                } catch (error) {
                    console.error(`Error syncing fine ${fine.id}:`, error.message);
                }
            }

            console.log(`Sync completed. Updated ${syncedCount} fines with plate data.`);

            return {
                success: true,
                totalProcessed: finesWithoutPlates.length,
                syncedCount,
                results: syncResults
            };

        } catch (error) {
            console.error('Error in plate recognition sync:', error);
            throw error;
        }
    }

    /**
     * Find correlated plate recognition data for a fine
     */
    async findCorrelatedPlateRecognition(fine) {
        try {
            const fineTime = new Date(fine.violationDateTime);
            const timeWindowStart = new Date(fineTime.getTime() - (this.syncTimeWindow * 1000));
            const timeWindowEnd = new Date(fineTime.getTime() + (this.syncTimeWindow * 1000));

            // Method 1: Direct timestamp correlation with plate recognition data
            const plateRecognitions = await PlateRecognition.findAll({
                where: {
                    createdAt: {
                        [Op.between]: [timeWindowStart, timeWindowEnd]
                    },
                    status: 'success',
                    confidence: {
                        [Op.gte]: 70 // Minimum confidence threshold
                    }
                },
                order: [['confidence', 'DESC'], ['createdAt', 'ASC']]
            });

            if (plateRecognitions.length > 0) {
                const bestMatch = plateRecognitions[0];
                return {
                    plateNumber: bestMatch.plateNumber,
                    confidence: bestMatch.confidence,
                    correlationMethod: 'direct_timestamp',
                    plateRecognitionId: bestMatch.id
                };
            }

            // Method 2: Check if there are correlated images in radar readings
            const radarReading = await RadarReading.findOne({
                where: {
                    fineId: fine.id,
                    correlatedImages: {
                        [Op.not]: null
                    }
                }
            });

            if (radarReading && radarReading.correlatedImages) {
                // Try to find plate recognition for correlated images
                const correlatedImages = JSON.parse(radarReading.correlatedImages);
                
                for (const imageInfo of correlatedImages) {
                    const plateFromImage = await this.findPlateRecognitionByImagePath(imageInfo.path);
                    if (plateFromImage) {
                        return {
                            plateNumber: plateFromImage.plateNumber,
                            confidence: plateFromImage.confidence,
                            correlationMethod: 'correlated_image',
                            plateRecognitionId: plateFromImage.id
                        };
                    }
                }
            }

            // Method 3: Fuzzy time matching with broader window
            const broaderTimeStart = new Date(fineTime.getTime() - (this.syncTimeWindow * 2 * 1000));
            const broaderTimeEnd = new Date(fineTime.getTime() + (this.syncTimeWindow * 2 * 1000));

            const fuzzyMatches = await PlateRecognition.findAll({
                where: {
                    createdAt: {
                        [Op.between]: [broaderTimeStart, broaderTimeEnd]
                    },
                    status: 'success',
                    confidence: {
                        [Op.gte]: 80 // Higher confidence for fuzzy matching
                    }
                },
                order: [['confidence', 'DESC']]
            });

            if (fuzzyMatches.length > 0) {
                const bestFuzzyMatch = fuzzyMatches[0];
                return {
                    plateNumber: bestFuzzyMatch.plateNumber,
                    confidence: bestFuzzyMatch.confidence,
                    correlationMethod: 'fuzzy_timestamp',
                    plateRecognitionId: bestFuzzyMatch.id
                };
            }

            return null;

        } catch (error) {
            console.error('Error finding correlated plate recognition:', error);
            return null;
        }
    }

    /**
     * Find plate recognition by image path
     */
    async findPlateRecognitionByImagePath(imagePath) {
        try {
            const plateRecognition = await PlateRecognition.findOne({
                where: {
                    [Op.or]: [
                        { filepath: { [Op.like]: `%${imagePath}%` } },
                        { imageUrl: { [Op.like]: `%${imagePath}%` } }
                    ],
                    status: 'success'
                },
                order: [['confidence', 'DESC']]
            });

            return plateRecognition;
        } catch (error) {
            console.error('Error finding plate recognition by image path:', error);
            return null;
        }
    }

    /**
     * Create fines from plate recognition data that don't have associated fines yet
     */
    async createFinesFromPlateRecognition() {
        try {
            console.log('Creating fines from unprocessed plate recognition data...');

            // Get plate recognitions that don't have associated fines
            const unprocessedPlates = await PlateRecognition.findAll({
                where: {
                    status: 'success',
                    confidence: {
                        [Op.gte]: 75 // Minimum confidence for auto-fine creation
                    }
                },
                order: [['createdAt', 'DESC']],
                limit: 50
            });

            let createdCount = 0;
            const createdFines = [];

            for (const plateRecord of unprocessedPlates) {
                try {
                    // Check if there's already a fine for this time period
                    const existingFine = await this.findExistingFineForPlateRecord(plateRecord);
                    
                    if (!existingFine) {
                        // Try to find associated radar reading or create default fine
                        const radarReading = await this.findRadarReadingForPlateRecord(plateRecord);
                        
                        if (radarReading) {
                            const fine = await this.createFineFromRadarAndPlate(radarReading, plateRecord);
                            if (fine) {
                                createdCount++;
                                createdFines.push(fine);
                                console.log(`Created fine ${fine.id} from plate ${plateRecord.plateNumber}`);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error processing plate record ${plateRecord.id}:`, error.message);
                }
            }

            console.log(`Created ${createdCount} new fines from plate recognition data.`);

            return {
                success: true,
                totalProcessed: unprocessedPlates.length,
                createdCount,
                createdFines
            };

        } catch (error) {
            console.error('Error creating fines from plate recognition:', error);
            throw error;
        }
    }

    /**
     * Find existing fine for plate record
     */
    async findExistingFineForPlateRecord(plateRecord) {
        const timeWindow = 10; // 10 seconds
        const plateTime = new Date(plateRecord.createdAt);
        const timeStart = new Date(plateTime.getTime() - (timeWindow * 1000));
        const timeEnd = new Date(plateTime.getTime() + (timeWindow * 1000));

        return await Fine.findOne({
            where: {
                [Op.or]: [
                    { vehiclePlate: plateRecord.plateNumber },
                    {
                        violationDateTime: {
                            [Op.between]: [timeStart, timeEnd]
                        }
                    }
                ]
            }
        });
    }

    /**
     * Find radar reading for plate record
     */
    async findRadarReadingForPlateRecord(plateRecord) {
        const timeWindow = 5; // 5 seconds
        const plateTime = new Date(plateRecord.createdAt);
        const timeStart = new Date(plateTime.getTime() - (timeWindow * 1000));
        const timeEnd = new Date(plateTime.getTime() + (timeWindow * 1000));

        return await RadarReading.findOne({
            where: {
                detectionTime: {
                    [Op.between]: [timeStart, timeEnd]
                },
                isViolation: true
            },
            order: [['detectionTime', 'ASC']]
        });
    }

    /**
     * Create fine from radar reading and plate data
     */
    async createFineFromRadarAndPlate(radarReading, plateRecord) {
        try {
            const violationAmount = radarReading.speedDetected - radarReading.speedLimit;
            let fineAmount = 0;

            // Calculate fine amount based on violation severity
            if (violationAmount <= 10) {
                fineAmount = 50;
            } else if (violationAmount <= 20) {
                fineAmount = 100;
            } else if (violationAmount <= 30) {
                fineAmount = 200;
            } else {
                fineAmount = 300;
            }

            const fine = await Fine.create({
                radarId: radarReading.radarId,
                vehiclePlate: plateRecord.plateNumber,
                speedDetected: radarReading.speedDetected,
                speedLimit: radarReading.speedLimit,
                violationAmount,
                fineAmount,
                violationDateTime: radarReading.detectionTime,
                status: 'pending',
                imageUrl: plateRecord.imageUrl,
                notes: `Auto-generated from plate recognition. Confidence: ${plateRecord.confidence}%. Plate ID: ${plateRecord.id}`
            });

            // Update radar reading to link to this fine
            await radarReading.update({ fineId: fine.id });

            return fine;

        } catch (error) {
            console.error('Error creating fine from radar and plate data:', error);
            return null;
        }
    }

    /**
     * Get sync statistics
     */
    async getSyncStatistics() {
        try {
            const totalFines = await Fine.count();
            const finesWithPlates = await Fine.count({
                where: {
                    vehiclePlate: {
                        [Op.and]: [
                            { [Op.not]: null },
                            { [Op.not]: '' }
                        ]
                    }
                }
            });

            const totalPlateRecognitions = await PlateRecognition.count();
            const successfulPlateRecognitions = await PlateRecognition.count({
                where: { status: 'success' }
            });

            return {
                fines: {
                    total: totalFines,
                    withPlates: finesWithPlates,
                    withoutPlates: totalFines - finesWithPlates,
                    plateCompletionRate: totalFines > 0 ? ((finesWithPlates / totalFines) * 100).toFixed(2) : 0
                },
                plateRecognitions: {
                    total: totalPlateRecognitions,
                    successful: successfulPlateRecognitions,
                    successRate: totalPlateRecognitions > 0 ? ((successfulPlateRecognitions / totalPlateRecognitions) * 100).toFixed(2) : 0
                }
            };
        } catch (error) {
            console.error('Error getting sync statistics:', error);
            throw error;
        }
    }
}

module.exports = PlateRecognitionToFinesSync;
