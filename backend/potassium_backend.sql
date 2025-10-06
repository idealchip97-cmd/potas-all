-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 30, 2025 at 06:50 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `potassium_backend`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `userId` int(11) DEFAULT NULL COMMENT 'User who performed the action (null for system actions)',
  `action` varchar(255) NOT NULL COMMENT 'Action performed (CREATE, UPDATE, DELETE, LOGIN, etc.)',
  `entityType` varchar(255) NOT NULL COMMENT 'Type of entity affected (User, Radar, Fine, Report, etc.)',
  `entityId` int(11) DEFAULT NULL COMMENT 'ID of the affected entity',
  `oldValues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Previous values before the change' CHECK (json_valid(`oldValues`)),
  `newValues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'New values after the change' CHECK (json_valid(`newValues`)),
  `ipAddress` varchar(255) DEFAULT NULL COMMENT 'IP address from which the action was performed',
  `userAgent` text DEFAULT NULL COMMENT 'User agent string from the request',
  `sessionId` varchar(255) DEFAULT NULL COMMENT 'Session ID for tracking user sessions',
  `severity` enum('low','medium','high','critical') DEFAULT 'low' COMMENT 'Severity level of the action for security monitoring',
  `success` tinyint(1) DEFAULT 1 COMMENT 'Whether the action was successful',
  `errorMessage` text DEFAULT NULL COMMENT 'Error message if the action failed',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cars`
--

CREATE TABLE `cars` (
  `id` int(11) NOT NULL,
  `plateNumber` varchar(20) NOT NULL COMMENT 'License plate number of the vehicle',
  `color` varchar(20) NOT NULL COMMENT 'Color of the vehicle',
  `type` varchar(20) NOT NULL COMMENT 'Type of vehicle (sedan, SUV, truck, etc.)',
  `imageUrl` text NOT NULL COMMENT 'URL to access the vehicle image',
  `imagePath` text DEFAULT NULL COMMENT 'Local file path to the uploaded image',
  `confidence` float DEFAULT NULL COMMENT 'AI confidence score for the detection (0-100)',
  `cameraInfo` text DEFAULT NULL COMMENT 'Information about the camera that captured the image',
  `detectionId` varchar(100) DEFAULT NULL COMMENT 'Identifier for the detection method used (e.g., strict_, regular_, traffic_)',
  `timestamp` datetime NOT NULL COMMENT 'When the vehicle was detected',
  `location` varchar(255) DEFAULT NULL COMMENT 'Location where the vehicle was detected',
  `speed` int(11) DEFAULT NULL COMMENT 'Detected speed of the vehicle (if available)',
  `direction` varchar(50) DEFAULT NULL COMMENT 'Direction of travel (north, south, east, west)',
  `processingEngine` varchar(50) DEFAULT 'enhanced-vision' COMMENT 'AI engine used for processing (chatgpt-vision, tesseract, enhanced-vision)',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional metadata about the detection' CHECK (json_valid(`metadata`)),
  `plateRecognitionId` int(11) DEFAULT NULL COMMENT 'ID of the associated plate recognition record',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fines`
--

CREATE TABLE `fines` (
  `id` int(11) NOT NULL,
  `radarId` int(11) NOT NULL,
  `vehiclePlate` varchar(255) DEFAULT NULL COMMENT 'Vehicle license plate number if detected',
  `speedDetected` int(11) NOT NULL COMMENT 'Speed detected in km/h',
  `speedLimit` int(11) NOT NULL COMMENT 'Speed limit at the time of violation in km/h',
  `violationAmount` int(11) NOT NULL COMMENT 'Amount of speed over the limit in km/h',
  `fineAmount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Fine amount in currency',
  `violationDateTime` datetime NOT NULL COMMENT 'Date and time when violation occurred',
  `status` enum('pending','processed','paid','cancelled') DEFAULT 'pending',
  `imageUrl` varchar(255) DEFAULT NULL COMMENT 'URL to violation image if available',
  `notes` text DEFAULT NULL,
  `processedBy` int(11) DEFAULT NULL,
  `processedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `fines`
--

INSERT INTO `fines` (`id`, `radarId`, `vehiclePlate`, `speedDetected`, `speedLimit`, `violationAmount`, `fineAmount`, `violationDateTime`, `status`, `imageUrl`, `notes`, `processedBy`, `processedAt`, `createdAt`, `updatedAt`) VALUES
(1501, 1, NULL, 55, 30, 25, 200.00, '2025-09-30 14:58:30', 'pending', NULL, 'Speed violation: 55 km/h in 30 km/h zone. Excess: 25 km/h. Source: 127.0.0.1:34154.', NULL, NULL, '2025-09-30 18:02:04', '2025-09-30 18:02:04'),
(1502, 1, NULL, 45, 30, 15, 100.00, '2025-09-30 14:58:40', 'pending', NULL, 'Speed violation: 45 km/h in 30 km/h zone. Excess: 15 km/h. Source: 127.0.0.1:34154.', NULL, NULL, '2025-09-30 18:02:10', '2025-09-30 18:02:10'),
(1503, 3, NULL, 60, 30, 30, 200.00, '2025-09-30 14:58:45', 'pending', NULL, 'Speed violation: 60 km/h in 30 km/h zone. Excess: 30 km/h. Source: 127.0.0.1:34154.', NULL, NULL, '2025-09-30 18:02:16', '2025-09-30 18:02:16'),
(1504, 4, NULL, 35, 30, 5, 50.00, '2025-09-30 20:53:00', 'pending', NULL, 'Speed violation: 35 km/h in 30 km/h zone. Excess: 5 km/h. Source: 127.0.0.1:34154.', NULL, NULL, '2025-09-30 18:02:24', '2025-09-30 18:02:24'),
(1505, 1, NULL, 55, 30, 25, 200.00, '2025-09-30 18:08:30', 'pending', NULL, 'Speed violation: 55 km/h in 30 km/h zone. Excess: 25 km/h. Source: 127.0.0.1:55718.', NULL, NULL, '2025-09-30 18:09:05', '2025-09-30 18:09:05'),
(1506, 3, NULL, 45, 30, 15, 100.00, '2025-09-30 21:08:40', 'pending', NULL, 'Speed violation: 45 km/h in 30 km/h zone. Excess: 15 km/h. Source: 127.0.0.1:33917.', NULL, NULL, '2025-09-30 18:09:17', '2025-09-30 18:09:17'),
(1507, 1, NULL, 55, 30, 25, 200.00, '2025-09-30 18:02:30', 'pending', NULL, 'Speed violation: 55 km/h in 30 km/h zone. Excess: 25 km/h. Source: 127.0.0.1:46187.', NULL, NULL, '2025-09-30 18:14:35', '2025-09-30 18:14:35');

-- --------------------------------------------------------

--
-- Table structure for table `plate_recognitions`
--

CREATE TABLE `plate_recognitions` (
  `id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL COMMENT 'Original filename of the uploaded image',
  `filepath` varchar(255) NOT NULL COMMENT 'Server path to the stored image file',
  `plateNumber` varchar(255) DEFAULT NULL COMMENT 'Recognized license plate number',
  `confidence` float DEFAULT 0 COMMENT 'OCR confidence score (0-100)',
  `status` enum('processing','success','failed') NOT NULL DEFAULT 'processing' COMMENT 'Processing status of the recognition',
  `processedBy` int(11) NOT NULL COMMENT 'ID of the user who processed this image',
  `imageUrl` varchar(255) DEFAULT NULL COMMENT 'Public URL to access the image',
  `ocrEngine` varchar(255) DEFAULT 'tesseract' COMMENT 'OCR engine used for recognition',
  `processingTime` int(11) DEFAULT NULL COMMENT 'Processing time in milliseconds',
  `errorMessage` text DEFAULT NULL COMMENT 'Error message if processing failed',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional metadata about the recognition process' CHECK (json_valid(`metadata`)),
  `detectionId` varchar(100) DEFAULT NULL COMMENT 'Identifier for the detection method used',
  `cameraInfo` text DEFAULT NULL COMMENT 'Information about the camera that captured the image',
  `processingMethod` varchar(100) DEFAULT 'enhanced-vision' COMMENT 'Method used for processing (chatgpt-vision, tesseract, enhanced-vision)',
  `vehicleColor` varchar(50) DEFAULT NULL COMMENT 'Detected color of the vehicle',
  `vehicleType` varchar(50) DEFAULT NULL COMMENT 'Detected type of vehicle',
  `location` varchar(255) DEFAULT NULL COMMENT 'Location where the image was captured',
  `allResults` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Results from all AI engines used' CHECK (json_valid(`allResults`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `radars`
--

CREATE TABLE `radars` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL COMMENT 'Physical location within the factory',
  `ipAddress` varchar(255) DEFAULT NULL,
  `serialNumber` varchar(255) NOT NULL,
  `speedLimit` int(11) NOT NULL DEFAULT 50 COMMENT 'Speed limit in km/h for this radar location',
  `status` enum('active','inactive','maintenance','error') DEFAULT 'active',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `installationDate` datetime DEFAULT NULL,
  `lastMaintenance` datetime DEFAULT NULL,
  `ftpPath` varchar(255) DEFAULT NULL COMMENT 'FTP path for receiving data from this radar',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `radars`
--

INSERT INTO `radars` (`id`, `name`, `location`, `ipAddress`, `serialNumber`, `speedLimit`, `status`, `latitude`, `longitude`, `installationDate`, `lastMaintenance`, `ftpPath`, `createdAt`, `updatedAt`) VALUES
(1, 'Main Gate Radar', 'Factory Main Entrance', '192.168.1.101', 'RDR-001-MG', 30, 'active', 40.71280000, -74.00600000, '2023-01-15 03:00:00', '2024-01-15 03:00:00', '/ftp/radar001', '2025-09-25 19:14:39', '2025-09-25 19:14:39'),
(2, 'Production Area A Radar', 'Production Zone A', '192.168.1.102', 'RDR-002-PA', 20, 'active', 40.71300000, -74.00620000, '2023-02-01 03:00:00', '2024-02-01 03:00:00', '/ftp/radar002', '2025-09-25 19:14:39', '2025-09-25 19:14:39'),
(3, 'Production Area B Radar', 'Production Zone B', '192.168.1.103', 'RDR-003-PB', 20, 'active', 40.71310000, -74.00630000, '2023-02-15 03:00:00', '2024-02-15 03:00:00', '/ftp/radar003', '2025-09-25 19:14:39', '2025-09-25 19:14:39'),
(4, 'Warehouse District Radar', 'Warehouse District', '192.168.1.104', 'RDR-004-WH', 25, 'active', 40.71250000, -74.00580000, '2023-03-10 03:00:00', '2024-03-10 03:00:00', '/ftp/radar004', '2025-09-25 19:14:39', '2025-09-25 19:14:39'),
(5, 'Loading Dock Radar', 'Loading Dock Area', '192.168.1.105', 'RDR-005-LD', 15, 'maintenance', 40.71320000, -74.00550000, '2023-04-20 03:00:00', '2024-04-20 03:00:00', '/ftp/radar005', '2025-09-25 19:14:39', '2025-09-25 19:14:39'),
(6, 'Emergency Exit Radar', 'Emergency Exit Route', '192.168.1.106', 'RDR-006-EE', 40, 'inactive', 40.71200000, -74.00650000, '2023-05-05 03:00:00', '2024-05-05 03:00:00', '/ftp/radar006', '2025-09-25 19:14:39', '2025-09-25 19:14:39'),
(7, 'Parking Area Radar', 'Employee Parking', '192.168.1.107', 'RDR-007-PA', 10, 'active', 40.71180000, -74.00700000, '2023-06-01 03:00:00', '2024-06-01 03:00:00', '/ftp/radar007', '2025-09-25 19:14:39', '2025-09-25 19:14:39'),
(8, 'Quality Control Radar', 'Quality Control Area', '192.168.1.108', 'RDR-008-QC', 15, 'error', 40.71350000, -74.00500000, '2023-07-15 03:00:00', '2024-07-15 03:00:00', '/ftp/radar008', '2025-09-25 19:14:39', '2025-09-25 19:14:39');

-- --------------------------------------------------------

--
-- Table structure for table `radar_readings`
--

CREATE TABLE `radar_readings` (
  `id` int(11) NOT NULL,
  `radarId` int(11) NOT NULL COMMENT 'ID of the radar that detected the speed',
  `speedDetected` int(11) NOT NULL COMMENT 'Speed detected in km/h',
  `speedLimit` int(11) NOT NULL DEFAULT 30 COMMENT 'Speed limit at the time of detection in km/h',
  `detectionTime` datetime NOT NULL COMMENT 'Exact time when speed was detected',
  `isViolation` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this reading constitutes a speed violation',
  `fineId` int(11) DEFAULT NULL COMMENT 'Associated fine ID if violation resulted in a fine',
  `correlatedImages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of correlated camera image URLs within 2-second window' CHECK (json_valid(`correlatedImages`)),
  `sourceIP` varchar(255) DEFAULT NULL COMMENT 'IP address of the UDP source',
  `rawData` text DEFAULT NULL COMMENT 'Original UDP message received',
  `processed` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this reading has been processed for violations',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `radar_readings`
--

INSERT INTO `radar_readings` (`id`, `radarId`, `speedDetected`, `speedLimit`, `detectionTime`, `isViolation`, `fineId`, `correlatedImages`, `sourceIP`, `rawData`, `processed`, `createdAt`, `updatedAt`) VALUES
(1, 1, 55, 30, '2025-09-30 14:58:30', 1, 1501, NULL, '127.0.0.1', 'ID: 1,Speed: 55, Time: 14:58:30.', 0, '2025-09-30 18:02:04', '2025-09-30 18:02:04'),
(2, 2, 25, 30, '2025-09-30 14:58:35', 0, NULL, NULL, '127.0.0.1', 'ID: 2,Speed: 25, Time: 14:58:35.', 0, '2025-09-30 18:02:06', '2025-09-30 18:02:06'),
(3, 1, 45, 30, '2025-09-30 14:58:40', 1, 1502, NULL, '127.0.0.1', 'ID: 1,Speed: 45, Time: 14:58:40.', 0, '2025-09-30 18:02:10', '2025-09-30 18:02:10'),
(4, 3, 60, 30, '2025-09-30 14:58:45', 1, 1503, NULL, '127.0.0.1', 'ID: 3,Speed: 60, Time: 14:58:45.', 0, '2025-09-30 18:02:16', '2025-09-30 18:02:16'),
(5, 4, 35, 30, '2025-09-30 20:53:00', 1, 1504, NULL, '127.0.0.1', '{\"radarId\":4,\"speed\":35,\"timestamp\":\"2025-09-30T17:53:00Z\"}', 0, '2025-09-30 18:02:24', '2025-09-30 18:02:24'),
(6, 1, 55, 30, '2025-09-30 18:08:30', 1, 1505, NULL, '127.0.0.1', 'ID: 1,Speed: 55, Time: 18:08:30.', 0, '2025-09-30 18:09:05', '2025-09-30 18:09:05'),
(7, 2, 25, 30, '2025-09-30 18:08:35', 0, NULL, NULL, '127.0.0.1', 'ID: 2,Speed: 25, Time: 18:08:35.', 0, '2025-09-30 18:09:11', '2025-09-30 18:09:11'),
(8, 3, 45, 30, '2025-09-30 21:08:40', 1, 1506, NULL, '127.0.0.1', '{\"radarId\":3,\"speed\":45,\"timestamp\":\"2025-09-30T18:08:40Z\"}', 0, '2025-09-30 18:09:17', '2025-09-30 18:09:17'),
(9, 1, 55, 30, '2025-09-30 18:02:30', 1, 1507, NULL, '127.0.0.1', 'ID: 1,Speed: 55, Time: 18:02:30.', 0, '2025-09-30 18:14:35', '2025-09-30 18:14:35');

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `reportTypeId` int(11) NOT NULL COMMENT 'Reference to the report type',
  `title` varchar(255) NOT NULL COMMENT 'Custom title for this specific report instance',
  `description` text DEFAULT NULL COMMENT 'Optional description or notes for this report',
  `generatedBy` int(11) NOT NULL COMMENT 'User who generated this report',
  `status` enum('pending','generating','completed','failed','cancelled') DEFAULT 'pending' COMMENT 'Current status of report generation',
  `parameters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON object containing report parameters (date range, filters, etc.)' CHECK (json_valid(`parameters`)),
  `filePath` varchar(255) DEFAULT NULL COMMENT 'Path to generated report file (PDF, Excel, etc.)',
  `fileFormat` enum('pdf','excel','csv','json') DEFAULT 'pdf' COMMENT 'Format of the generated report file',
  `fileSize` int(11) DEFAULT NULL COMMENT 'Size of generated file in bytes',
  `recordCount` int(11) DEFAULT NULL COMMENT 'Number of records included in the report',
  `generationStartTime` datetime DEFAULT NULL COMMENT 'When report generation started',
  `generationEndTime` datetime DEFAULT NULL COMMENT 'When report generation completed',
  `errorMessage` text DEFAULT NULL COMMENT 'Error message if report generation failed',
  `isScheduled` tinyint(1) DEFAULT 0 COMMENT 'Whether this report was generated from a schedule',
  `scheduleId` int(11) DEFAULT NULL COMMENT 'Reference to schedule if this is a scheduled report',
  `expiresAt` datetime DEFAULT NULL COMMENT 'When this report file should be automatically deleted',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_data`
--

CREATE TABLE `report_data` (
  `id` int(11) NOT NULL,
  `reportId` int(11) NOT NULL COMMENT 'Reference to the parent report',
  `dataType` enum('violation_summary','radar_statistics','financial_data','performance_metrics','trend_analysis','comparative_data','raw_data') NOT NULL COMMENT 'Type of data stored in this record',
  `dataKey` varchar(255) NOT NULL COMMENT 'Key identifier for this data point (e.g., radar_id, date, metric_name)',
  `dataValue` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'JSON object containing the actual data values' CHECK (json_valid(`dataValue`)),
  `aggregationLevel` enum('hourly','daily','weekly','monthly','yearly','total') NOT NULL COMMENT 'Level of data aggregation',
  `periodStart` datetime DEFAULT NULL COMMENT 'Start date/time for this data period',
  `periodEnd` datetime DEFAULT NULL COMMENT 'End date/time for this data period',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional metadata about this data point' CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_schedules`
--

CREATE TABLE `report_schedules` (
  `id` int(11) NOT NULL,
  `reportTypeId` int(11) NOT NULL COMMENT 'Type of report to generate on schedule',
  `name` varchar(255) NOT NULL COMMENT 'Name for this scheduled report',
  `description` text DEFAULT NULL COMMENT 'Description of the scheduled report',
  `createdBy` int(11) NOT NULL COMMENT 'User who created this schedule',
  `frequency` enum('hourly','daily','weekly','monthly','quarterly','yearly') NOT NULL COMMENT 'How often to generate this report',
  `cronExpression` varchar(255) DEFAULT NULL COMMENT 'Cron expression for custom scheduling',
  `parameters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Default parameters for scheduled report generation' CHECK (json_valid(`parameters`)),
  `recipients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON array of email addresses to send report to' CHECK (json_valid(`recipients`)),
  `isActive` tinyint(1) DEFAULT 1 COMMENT 'Whether this schedule is currently active',
  `nextRunTime` datetime DEFAULT NULL COMMENT 'When this schedule should next run',
  `lastRunTime` datetime DEFAULT NULL COMMENT 'When this schedule last ran',
  `lastRunStatus` enum('success','failed','pending') DEFAULT NULL COMMENT 'Status of the last scheduled run',
  `runCount` int(11) DEFAULT 0 COMMENT 'Number of times this schedule has run',
  `maxRetries` int(11) DEFAULT 3 COMMENT 'Maximum number of retry attempts if generation fails',
  `retryCount` int(11) DEFAULT 0 COMMENT 'Current retry count for failed generations',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_types`
--

CREATE TABLE `report_types` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Report type name (e.g., Daily Violations, Monthly Summary)',
  `description` text DEFAULT NULL COMMENT 'Detailed description of what this report contains',
  `category` enum('violation_summary','radar_performance','financial_report','operational_analytics','compliance_audit','maintenance_schedule','traffic_analysis','custom_report') NOT NULL COMMENT 'Category of the report for grouping and filtering',
  `templateConfig` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON configuration for report template (columns, filters, etc.)' CHECK (json_valid(`templateConfig`)),
  `isActive` tinyint(1) DEFAULT 1 COMMENT 'Whether this report type is currently available',
  `accessLevel` enum('admin','operator','viewer') DEFAULT 'viewer' COMMENT 'Minimum access level required to generate this report',
  `estimatedGenerationTime` int(11) DEFAULT NULL COMMENT 'Estimated time in seconds to generate this report',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_metrics`
--

CREATE TABLE `system_metrics` (
  `id` int(11) NOT NULL,
  `metricType` enum('radar_uptime','detection_accuracy','system_performance','data_processing_time','error_rate','network_latency','storage_usage','api_response_time') NOT NULL COMMENT 'Type of metric being recorded',
  `entityType` enum('system','radar','user','api_endpoint') NOT NULL COMMENT 'Type of entity this metric relates to',
  `entityId` int(11) DEFAULT NULL COMMENT 'ID of the specific entity (radar ID, user ID, etc.)',
  `metricValue` decimal(15,4) NOT NULL COMMENT 'Numeric value of the metric',
  `unit` varchar(20) DEFAULT NULL COMMENT 'Unit of measurement (ms, %, MB, etc.)',
  `timestamp` datetime NOT NULL COMMENT 'When this metric was recorded',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional context or details about the metric' CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `udp_readings`
--

CREATE TABLE `udp_readings` (
  `id` int(11) NOT NULL,
  `radarId` int(11) NOT NULL COMMENT 'ID of the radar that sent the data',
  `speedDetected` int(11) NOT NULL COMMENT 'Speed detected in km/h',
  `speedLimit` int(11) NOT NULL DEFAULT 30 COMMENT 'Speed limit at the time of detection in km/h',
  `detectionTime` datetime NOT NULL COMMENT 'Exact time when speed was detected',
  `isViolation` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this reading constitutes a speed violation',
  `sourceIP` varchar(45) DEFAULT NULL COMMENT 'IP address of the UDP source',
  `sourcePort` int(11) DEFAULT NULL COMMENT 'Port number of the UDP source',
  `rawMessage` text DEFAULT NULL COMMENT 'Original UDP message received',
  `messageFormat` enum('text','json','binary','unknown') NOT NULL DEFAULT 'unknown' COMMENT 'Format of the received message',
  `hexData` text DEFAULT NULL COMMENT 'Hexadecimal representation of binary data',
  `processed` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this reading has been processed',
  `fineCreated` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether a fine was created for this violation',
  `fineId` int(11) DEFAULT NULL COMMENT 'Associated fine ID if violation resulted in a fine',
  `correlatedImages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of correlated camera image URLs' CHECK (json_valid(`correlatedImages`)),
  `processingNotes` text DEFAULT NULL COMMENT 'Notes about processing this reading',
  `errorMessage` text DEFAULT NULL COMMENT 'Error message if processing failed',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `udp_readings`
--

INSERT INTO `udp_readings` (`id`, `radarId`, `speedDetected`, `speedLimit`, `detectionTime`, `isViolation`, `sourceIP`, `sourcePort`, `rawMessage`, `messageFormat`, `hexData`, `processed`, `fineCreated`, `fineId`, `correlatedImages`, `processingNotes`, `errorMessage`, `createdAt`, `updatedAt`) VALUES
(1, 1, 55, 30, '2025-09-30 18:08:30', 1, '127.0.0.1', 55718, 'ID: 1,Speed: 55, Time: 18:08:30.', 'text', NULL, 1, 1, 1505, NULL, 'Fine created: $200', NULL, '2025-09-30 18:09:04', '2025-09-30 18:09:05'),
(2, 2, 25, 30, '2025-09-30 18:08:35', 0, '127.0.0.1', 33654, 'ID: 2,Speed: 25, Time: 18:08:35.', 'text', NULL, 0, 0, NULL, NULL, NULL, NULL, '2025-09-30 18:09:11', '2025-09-30 18:09:11'),
(3, 3, 45, 30, '2025-09-30 21:08:40', 1, '127.0.0.1', 33917, '{\"radarId\":3,\"speed\":45,\"timestamp\":\"2025-09-30T18:08:40Z\"}', 'json', NULL, 1, 1, 1506, NULL, 'Fine created: $100', NULL, '2025-09-30 18:09:17', '2025-09-30 18:09:17'),
(4, 1, 55, 30, '2025-09-30 18:02:30', 1, '127.0.0.1', 46187, 'ID: 1,Speed: 55, Time: 18:02:30.', 'text', NULL, 1, 1, 1507, NULL, 'Fine created: $200', NULL, '2025-09-30 18:14:35', '2025-09-30 18:14:35');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `role` enum('admin','operator','viewer') DEFAULT 'operator',
  `isActive` tinyint(1) DEFAULT 1,
  `lastLogin` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `firstName`, `lastName`, `role`, `isActive`, `lastLogin`, `createdAt`, `updatedAt`) VALUES
(2, 'operator1@potasfactory.com', 'operator123', 'John', 'Operator', 'operator', 1, '2025-09-24 19:14:39', '2025-09-25 19:14:39', '2025-09-25 19:14:39'),
(3, 'operator2@potasfactory.com', 'operator123', 'Sarah', 'Controller', 'operator', 1, '2025-09-23 19:14:39', '2025-09-25 19:14:39', '2025-09-25 19:14:39'),
(4, 'viewer@potasfactory.com', 'viewer123', 'Jane', 'Viewer', 'viewer', 1, '2025-09-25 18:14:39', '2025-09-25 19:14:39', '2025-09-25 19:14:39'),
(5, 'inactive@potasfactory.com', 'inactive123', 'Inactive', 'User', 'viewer', 0, '2025-08-26 19:14:39', '2025-09-25 19:14:39', '2025-09-25 19:14:39'),
(6, 'admin@potasfactory.com', '$2a$12$/3/sb1PvVfKamJ6aby04ZOFOBScEyCNngDl85GBwX4/hUWcJr.Hnq', 'Admin', 'User', 'admin', 1, '2025-09-30 11:31:25', '2025-09-25 19:15:51', '2025-09-30 11:31:25'),
(7, 'test@example.com', '$2a$12$Pf2ZZZ6FanLv3HSKup0DfOKjcF2FsSAipSiQDVDRMaFt4cDrW1y3e', 'Test', 'User', 'admin', 1, '2025-09-30 18:31:44', '2025-09-30 18:31:37', '2025-09-30 18:31:44');

-- --------------------------------------------------------

--
-- Table structure for table `violations`
--

CREATE TABLE `violations` (
  `id` int(11) NOT NULL,
  `plateNumber` varchar(20) NOT NULL COMMENT 'License plate number of the violating vehicle',
  `imageUrl` text NOT NULL COMMENT 'URL to access the violation evidence image',
  `originalFileName` varchar(255) DEFAULT NULL COMMENT 'Original filename of the uploaded image',
  `processingMethod` varchar(100) DEFAULT NULL COMMENT 'Method used to process the violation (manual, automatic, ai-enhanced)',
  `confidence` float DEFAULT NULL COMMENT 'AI confidence score for the violation detection (0-100)',
  `vehicleInfo` text DEFAULT NULL COMMENT 'Additional information about the vehicle (color, type, etc.)',
  `cameraId` varchar(100) DEFAULT NULL COMMENT 'Identifier of the camera that captured the violation',
  `location` varchar(255) DEFAULT NULL COMMENT 'Location where the violation occurred',
  `speed` int(11) DEFAULT NULL COMMENT 'Detected speed of the vehicle during violation',
  `speedLimit` int(11) DEFAULT NULL COMMENT 'Speed limit at the location of violation',
  `violationType` varchar(100) NOT NULL DEFAULT 'speeding' COMMENT 'Type of traffic violation',
  `timestamp` datetime NOT NULL COMMENT 'When the violation occurred',
  `confirmed` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether the violation has been confirmed by an operator',
  `status` varchar(50) DEFAULT 'pending' COMMENT 'Current status of the violation',
  `fineAmount` decimal(10,2) DEFAULT NULL COMMENT 'Fine amount for the violation',
  `notes` text DEFAULT NULL COMMENT 'Additional notes about the violation',
  `reviewedBy` int(11) DEFAULT NULL COMMENT 'ID of the user who reviewed this violation',
  `reviewedAt` datetime DEFAULT NULL COMMENT 'When the violation was reviewed',
  `radarId` int(11) DEFAULT NULL COMMENT 'ID of the radar that detected this violation',
  `carId` int(11) DEFAULT NULL COMMENT 'ID of the associated car record',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional metadata about the violation' CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `audit_logs_user_id` (`userId`),
  ADD KEY `audit_logs_action` (`action`),
  ADD KEY `audit_logs_entity_type` (`entityType`),
  ADD KEY `audit_logs_entity_id` (`entityId`),
  ADD KEY `audit_logs_created_at` (`createdAt`),
  ADD KEY `audit_logs_severity` (`severity`),
  ADD KEY `audit_logs_success` (`success`),
  ADD KEY `audit_logs_user_id_created_at` (`userId`,`createdAt`);

--
-- Indexes for table `cars`
--
ALTER TABLE `cars`
  ADD PRIMARY KEY (`id`),
  ADD KEY `plateRecognitionId` (`plateRecognitionId`),
  ADD KEY `cars_plate_number` (`plateNumber`),
  ADD KEY `cars_color` (`color`),
  ADD KEY `cars_type` (`type`),
  ADD KEY `cars_timestamp` (`timestamp`),
  ADD KEY `cars_location` (`location`),
  ADD KEY `cars_processing_engine` (`processingEngine`);

--
-- Indexes for table `fines`
--
ALTER TABLE `fines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fines_radar_id` (`radarId`),
  ADD KEY `fines_status` (`status`),
  ADD KEY `fines_violation_date_time` (`violationDateTime`),
  ADD KEY `fines_speed_detected` (`speedDetected`),
  ADD KEY `fines_vehicle_plate` (`vehiclePlate`),
  ADD KEY `fines_processed_by` (`processedBy`),
  ADD KEY `fines_processed_at` (`processedAt`),
  ADD KEY `fines_radar_id_violation_date_time` (`radarId`,`violationDateTime`),
  ADD KEY `fines_status_violation_date_time` (`status`,`violationDateTime`),
  ADD KEY `fines_speed_detected_violation_date_time` (`speedDetected`,`violationDateTime`);

--
-- Indexes for table `plate_recognitions`
--
ALTER TABLE `plate_recognitions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `plate_recognitions_plate_number` (`plateNumber`),
  ADD KEY `plate_recognitions_status` (`status`),
  ADD KEY `plate_recognitions_processed_by` (`processedBy`),
  ADD KEY `plate_recognitions_created_at` (`createdAt`);

--
-- Indexes for table `radars`
--
ALTER TABLE `radars`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `serialNumber` (`serialNumber`),
  ADD UNIQUE KEY `radars_serial_number` (`serialNumber`),
  ADD KEY `radars_status` (`status`),
  ADD KEY `radars_location` (`location`),
  ADD KEY `radars_speed_limit` (`speedLimit`),
  ADD KEY `radars_latitude_longitude` (`latitude`,`longitude`),
  ADD KEY `radars_installation_date` (`installationDate`),
  ADD KEY `radars_last_maintenance` (`lastMaintenance`);

--
-- Indexes for table `radar_readings`
--
ALTER TABLE `radar_readings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `radar_readings_radar_id` (`radarId`),
  ADD KEY `radar_readings_detection_time` (`detectionTime`),
  ADD KEY `radar_readings_speed_detected` (`speedDetected`),
  ADD KEY `radar_readings_is_violation` (`isViolation`),
  ADD KEY `radar_readings_processed` (`processed`),
  ADD KEY `radar_readings_fine_id` (`fineId`),
  ADD KEY `radar_readings_radar_id_detection_time` (`radarId`,`detectionTime`),
  ADD KEY `radar_readings_detection_time_is_violation` (`detectionTime`,`isViolation`),
  ADD KEY `radar_readings_speed_detected_detection_time` (`speedDetected`,`detectionTime`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reports_report_type_id` (`reportTypeId`),
  ADD KEY `reports_generated_by` (`generatedBy`),
  ADD KEY `reports_status` (`status`),
  ADD KEY `reports_created_at` (`createdAt`),
  ADD KEY `reports_is_scheduled` (`isScheduled`),
  ADD KEY `reports_schedule_id` (`scheduleId`),
  ADD KEY `reports_expires_at` (`expiresAt`);

--
-- Indexes for table `report_data`
--
ALTER TABLE `report_data`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `report_data_report_id_data_type_data_key` (`reportId`,`dataType`,`dataKey`),
  ADD KEY `report_data_report_id` (`reportId`),
  ADD KEY `report_data_data_type` (`dataType`),
  ADD KEY `report_data_data_key` (`dataKey`),
  ADD KEY `report_data_aggregation_level` (`aggregationLevel`),
  ADD KEY `report_data_period_start_period_end` (`periodStart`,`periodEnd`);

--
-- Indexes for table `report_schedules`
--
ALTER TABLE `report_schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `report_schedules_report_type_id` (`reportTypeId`),
  ADD KEY `report_schedules_created_by` (`createdBy`),
  ADD KEY `report_schedules_frequency` (`frequency`),
  ADD KEY `report_schedules_is_active` (`isActive`),
  ADD KEY `report_schedules_next_run_time` (`nextRunTime`),
  ADD KEY `report_schedules_last_run_status` (`lastRunStatus`);

--
-- Indexes for table `report_types`
--
ALTER TABLE `report_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `report_types_category` (`category`),
  ADD KEY `report_types_is_active` (`isActive`),
  ADD KEY `report_types_access_level` (`accessLevel`);

--
-- Indexes for table `system_metrics`
--
ALTER TABLE `system_metrics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `system_metrics_metric_type` (`metricType`),
  ADD KEY `system_metrics_entity_type_entity_id` (`entityType`,`entityId`),
  ADD KEY `system_metrics_timestamp` (`timestamp`),
  ADD KEY `system_metrics_metric_type_timestamp` (`metricType`,`timestamp`),
  ADD KEY `system_metrics_entity_type_entity_id_timestamp` (`entityType`,`entityId`,`timestamp`);

--
-- Indexes for table `udp_readings`
--
ALTER TABLE `udp_readings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fineId` (`fineId`),
  ADD KEY `udp_readings_radar_id` (`radarId`),
  ADD KEY `udp_readings_detection_time` (`detectionTime`),
  ADD KEY `udp_readings_speed_detected` (`speedDetected`),
  ADD KEY `udp_readings_is_violation` (`isViolation`),
  ADD KEY `udp_readings_processed` (`processed`),
  ADD KEY `udp_readings_fine_created` (`fineCreated`),
  ADD KEY `udp_readings_source_i_p` (`sourceIP`),
  ADD KEY `udp_readings_message_format` (`messageFormat`),
  ADD KEY `udp_readings_radar_id_detection_time` (`radarId`,`detectionTime`),
  ADD KEY `udp_readings_detection_time_is_violation` (`detectionTime`,`isViolation`),
  ADD KEY `udp_readings_speed_detected_detection_time` (`speedDetected`,`detectionTime`),
  ADD KEY `udp_readings_created_at` (`createdAt`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `users_email` (`email`),
  ADD KEY `users_role` (`role`),
  ADD KEY `users_is_active` (`isActive`),
  ADD KEY `users_last_login` (`lastLogin`);

--
-- Indexes for table `violations`
--
ALTER TABLE `violations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `violations_plate_number` (`plateNumber`),
  ADD KEY `violations_confirmed` (`confirmed`),
  ADD KEY `violations_status` (`status`),
  ADD KEY `violations_violation_type` (`violationType`),
  ADD KEY `violations_timestamp` (`timestamp`),
  ADD KEY `violations_location` (`location`),
  ADD KEY `violations_radar_id` (`radarId`),
  ADD KEY `violations_car_id` (`carId`),
  ADD KEY `violations_reviewed_by` (`reviewedBy`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cars`
--
ALTER TABLE `cars`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fines`
--
ALTER TABLE `fines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1508;

--
-- AUTO_INCREMENT for table `plate_recognitions`
--
ALTER TABLE `plate_recognitions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `radars`
--
ALTER TABLE `radars`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `radar_readings`
--
ALTER TABLE `radar_readings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_data`
--
ALTER TABLE `report_data`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_schedules`
--
ALTER TABLE `report_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_types`
--
ALTER TABLE `report_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_metrics`
--
ALTER TABLE `system_metrics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `udp_readings`
--
ALTER TABLE `udp_readings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `violations`
--
ALTER TABLE `violations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `cars`
--
ALTER TABLE `cars`
  ADD CONSTRAINT `cars_ibfk_1` FOREIGN KEY (`plateRecognitionId`) REFERENCES `plate_recognitions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `fines`
--
ALTER TABLE `fines`
  ADD CONSTRAINT `fines_ibfk_1` FOREIGN KEY (`radarId`) REFERENCES `radars` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `fines_ibfk_2` FOREIGN KEY (`processedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `plate_recognitions`
--
ALTER TABLE `plate_recognitions`
  ADD CONSTRAINT `plate_recognitions_ibfk_1` FOREIGN KEY (`processedBy`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `radar_readings`
--
ALTER TABLE `radar_readings`
  ADD CONSTRAINT `radar_readings_ibfk_1` FOREIGN KEY (`radarId`) REFERENCES `radars` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `radar_readings_ibfk_2` FOREIGN KEY (`fineId`) REFERENCES `fines` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`reportTypeId`) REFERENCES `report_types` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`generatedBy`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `reports_ibfk_3` FOREIGN KEY (`scheduleId`) REFERENCES `report_schedules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `report_data`
--
ALTER TABLE `report_data`
  ADD CONSTRAINT `report_data_ibfk_1` FOREIGN KEY (`reportId`) REFERENCES `reports` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `report_schedules`
--
ALTER TABLE `report_schedules`
  ADD CONSTRAINT `report_schedules_ibfk_1` FOREIGN KEY (`reportTypeId`) REFERENCES `report_types` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `report_schedules_ibfk_2` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `udp_readings`
--
ALTER TABLE `udp_readings`
  ADD CONSTRAINT `udp_readings_ibfk_1` FOREIGN KEY (`radarId`) REFERENCES `radars` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `udp_readings_ibfk_2` FOREIGN KEY (`fineId`) REFERENCES `fines` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `violations`
--
ALTER TABLE `violations`
  ADD CONSTRAINT `violations_ibfk_1` FOREIGN KEY (`reviewedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `violations_ibfk_2` FOREIGN KEY (`radarId`) REFERENCES `radars` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `violations_ibfk_3` FOREIGN KEY (`carId`) REFERENCES `cars` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
