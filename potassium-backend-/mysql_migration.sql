-- MySQL Migration Script for Potassium Backend
-- Generated: 2025-09-25 18:58:00
-- Source: SQLite database export

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+03:00";

-- Use the potassium_backend database
USE `potassium_backend`;

-- Create radars table
CREATE TABLE IF NOT EXISTS `radars` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `ipAddress` varchar(255) DEFAULT NULL,
  `serialNumber` varchar(255) NOT NULL UNIQUE,
  `speedLimit` int(11) NOT NULL DEFAULT 50,
  `status` varchar(50) DEFAULT 'active',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `installationDate` datetime DEFAULT NULL,
  `lastMaintenance` datetime DEFAULT NULL,
  `ftpPath` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `serialNumber` (`serialNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert radar data
INSERT INTO `radars` (`id`, `name`, `location`, `ipAddress`, `serialNumber`, `speedLimit`, `status`, `latitude`, `longitude`, `installationDate`, `lastMaintenance`, `ftpPath`, `createdAt`, `updatedAt`) VALUES
(1, 'Main Gate Radar', 'Factory Main Entrance', '192.168.1.101', 'RDR-001-MG', 30, 'active', 31.20010000, 29.91870000, '2024-01-15 00:00:00', NULL, '/radar/main-gate', '2025-09-11 12:14:43', '2025-09-11 12:14:43'),
(2, 'Production Area Radar', 'Production Building A', '192.168.1.102', 'RDR-002-PA', 20, 'active', 31.20100000, 29.91950000, '2024-02-01 00:00:00', NULL, '/radar/production-a', '2025-09-11 12:14:43', '2025-09-11 12:14:43'),
(3, 'Warehouse Radar', 'Warehouse Complex', '192.168.1.103', 'RDR-003-WH', 25, 'active', 31.19950000, 29.91800000, '2024-01-20 00:00:00', NULL, '/radar/warehouse', '2025-09-11 12:14:43', '2025-09-11 12:14:43'),
(4, 'Loading Dock Radar', 'Loading Dock Area', '192.168.1.104', 'RDR-004-LD', 15, 'maintenance', 31.19900000, 29.91750000, '2024-02-10 00:00:00', NULL, '/radar/loading-dock', '2025-09-11 12:14:43', '2025-09-11 12:14:43'),
(5, 'Emergency Exit Radar', 'Emergency Exit Route', '192.168.1.105', 'RDR-005-EE', 40, 'active', 31.20050000, 29.91700000, '2024-01-25 00:00:00', NULL, '/radar/emergency-exit', '2025-09-11 12:14:43', '2025-09-11 12:14:43');

-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'operator',
  `isActive` tinyint(1) DEFAULT 1,
  `lastLogin` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create fines table
CREATE TABLE IF NOT EXISTS `fines` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `radarId` int(11) NOT NULL,
  `vehiclePlate` varchar(255) DEFAULT NULL,
  `speedDetected` int(11) NOT NULL,
  `speedLimit` int(11) NOT NULL,
  `violationAmount` int(11) NOT NULL,
  `fineAmount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `violationDateTime` datetime NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `imageUrl` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `processedBy` int(11) DEFAULT NULL,
  `processedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `radarId` (`radarId`),
  KEY `processedBy` (`processedBy`),
  CONSTRAINT `fines_ibfk_1` FOREIGN KEY (`radarId`) REFERENCES `radars` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `fines_ibfk_2` FOREIGN KEY (`processedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create cars table
CREATE TABLE IF NOT EXISTS `cars` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plateNumber` varchar(20) NOT NULL,
  `color` varchar(20) NOT NULL,
  `type` varchar(20) NOT NULL,
  `imageUrl` text NOT NULL,
  `imagePath` text DEFAULT NULL,
  `confidence` float DEFAULT NULL,
  `cameraInfo` text DEFAULT NULL,
  `detectionId` varchar(100) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `speed` int(11) DEFAULT NULL,
  `direction` varchar(50) DEFAULT NULL,
  `processingEngine` varchar(50) DEFAULT 'enhanced-vision',
  `metadata` json DEFAULT NULL,
  `plateRecognitionId` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `plateNumber` (`plateNumber`),
  KEY `color` (`color`),
  KEY `type` (`type`),
  KEY `timestamp` (`timestamp`),
  KEY `location` (`location`),
  KEY `processingEngine` (`processingEngine`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create violations table
CREATE TABLE IF NOT EXISTS `violations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plateNumber` varchar(20) NOT NULL,
  `imageUrl` text NOT NULL,
  `originalFileName` varchar(255) DEFAULT NULL,
  `processingMethod` varchar(100) DEFAULT NULL,
  `confidence` float DEFAULT NULL,
  `vehicleInfo` text DEFAULT NULL,
  `cameraId` varchar(100) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `speed` int(11) DEFAULT NULL,
  `speedLimit` int(11) DEFAULT NULL,
  `violationType` varchar(100) NOT NULL DEFAULT 'speeding',
  `timestamp` datetime NOT NULL,
  `confirmed` tinyint(1) NOT NULL DEFAULT 0,
  `status` varchar(50) DEFAULT 'pending',
  `fineAmount` decimal(10,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `reviewedBy` int(11) DEFAULT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  `radarId` int(11) DEFAULT NULL,
  `carId` int(11) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `plateNumber` (`plateNumber`),
  KEY `confirmed` (`confirmed`),
  KEY `status` (`status`),
  KEY `violationType` (`violationType`),
  KEY `timestamp` (`timestamp`),
  KEY `location` (`location`),
  KEY `radarId` (`radarId`),
  KEY `carId` (`carId`),
  KEY `reviewedBy` (`reviewedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create plate_recognitions table
CREATE TABLE IF NOT EXISTS `plate_recognitions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `filepath` varchar(255) NOT NULL,
  `plateNumber` varchar(255) DEFAULT NULL,
  `confidence` float DEFAULT 0,
  `status` varchar(50) NOT NULL DEFAULT 'processing',
  `processedBy` int(11) NOT NULL,
  `imageUrl` varchar(255) DEFAULT NULL,
  `ocrEngine` varchar(255) DEFAULT 'tesseract',
  `processingTime` int(11) DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `plateNumber` (`plateNumber`),
  KEY `status` (`status`),
  KEY `processedBy` (`processedBy`),
  KEY `createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create additional tables for reporting system
CREATE TABLE IF NOT EXISTS `report_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL UNIQUE,
  `description` text DEFAULT NULL,
  `category` varchar(100) NOT NULL,
  `templateConfig` json DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT 1,
  `accessLevel` varchar(50) DEFAULT 'viewer',
  `estimatedGenerationTime` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `category` (`category`),
  KEY `isActive` (`isActive`),
  KEY `accessLevel` (`accessLevel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reportTypeId` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `generatedBy` int(11) NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `parameters` json DEFAULT NULL,
  `filePath` varchar(255) DEFAULT NULL,
  `fileFormat` varchar(10) DEFAULT 'pdf',
  `fileSize` int(11) DEFAULT NULL,
  `recordCount` int(11) DEFAULT NULL,
  `generationStartTime` datetime DEFAULT NULL,
  `generationEndTime` datetime DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `isScheduled` tinyint(1) DEFAULT 0,
  `scheduleId` int(11) DEFAULT NULL,
  `expiresAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `reportTypeId` (`reportTypeId`),
  KEY `generatedBy` (`generatedBy`),
  KEY `status` (`status`),
  KEY `createdAt` (`createdAt`),
  KEY `isScheduled` (`isScheduled`),
  KEY `scheduleId` (`scheduleId`),
  KEY `expiresAt` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `entityType` varchar(255) NOT NULL,
  `entityId` int(11) DEFAULT NULL,
  `oldValues` json DEFAULT NULL,
  `newValues` json DEFAULT NULL,
  `ipAddress` varchar(255) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `sessionId` varchar(255) DEFAULT NULL,
  `severity` varchar(20) DEFAULT 'low',
  `success` tinyint(1) DEFAULT 1,
  `errorMessage` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `action` (`action`),
  KEY `entityType` (`entityType`),
  KEY `entityId` (`entityId`),
  KEY `createdAt` (`createdAt`),
  KEY `severity` (`severity`),
  KEY `success` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- End of migration script
