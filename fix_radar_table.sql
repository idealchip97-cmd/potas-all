-- Fix radar table by adding missing identifier column
USE potassium_backend;

-- Add identifier column (ignore error if it already exists)
ALTER TABLE radars ADD COLUMN identifier VARCHAR(255) NULL COMMENT 'Camera identifier (e.g., camera001, camera002)';

-- Update existing radars with identifiers
UPDATE radars SET identifier = 'camera001' WHERE id = 1;
UPDATE radars SET identifier = 'camera002' WHERE id = 2;
UPDATE radars SET identifier = 'camera003' WHERE id = 3;
UPDATE radars SET identifier = 'camera004' WHERE id = 4;
UPDATE radars SET identifier = 'camera005' WHERE id = 5;

-- Add unique constraint
ALTER TABLE radars ADD CONSTRAINT radars_identifier_unique UNIQUE (identifier);

-- Show the updated table structure
DESCRIBE radars;
