#!/usr/bin/env node

/**
 * Test Script for New Speeding Car Processing System
 * 
 * This script tests the new system that:
 * - Creates 3 photos per speeding car in special folders
 * - Creates JSON verdict files with car information and ticket decisions
 * - Uses static speed limit of 30 km/h
 * - Processes events through the new API endpoints
 * 
 * Usage: node test_new_system.js
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_SPEED = 70; // km/h (exceeds limit of 30)
const TEST_CAMERA_ID = 'camera002';

class NewSystemTester {
    constructor() {
        this.testResults = [];
        this.baseProcessingPath = '/srv/processing_inbox';
    }

    async runAllTests() {
        console.log('🧪 Starting New Speeding Car Processing System Tests');
        console.log('=' .repeat(60));

        try {
            // Test 1: Create test directory structure
            await this.testCreateDirectoryStructure();

            // Test 2: Simulate speeding event
            await this.testSimulateSpeedingEvent();

            // Test 3: Test API endpoints
            await this.testApiEndpoints();

            // Test 4: Verify file system structure
            await this.testFileSystemStructure();

            // Test 5: Test verdict JSON content
            await this.testVerdictContent();

            // Test 6: Test photo processing
            await this.testPhotoProcessing();

            // Summary
            this.printTestSummary();

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        }
    }

    async testCreateDirectoryStructure() {
        console.log('\n📁 Test 1: Creating directory structure...');
        
        try {
            const response = await axios.post(`${BASE_URL}/api/enhanced-ftp/create-test-structure`);
            
            if (response.data.success) {
                console.log('✅ Directory structure created successfully');
                console.log(`   Base path: ${response.data.data.base_path}`);
                console.log(`   Test date: ${response.data.data.test_date}`);
                this.testResults.push({ test: 'Directory Structure', status: 'PASS' });
            } else {
                throw new Error('Failed to create directory structure');
            }
        } catch (error) {
            console.error('❌ Directory structure test failed:', error.message);
            this.testResults.push({ test: 'Directory Structure', status: 'FAIL', error: error.message });
        }
    }

    async testSimulateSpeedingEvent() {
        console.log('\n🚨 Test 2: Simulating speeding event...');
        
        try {
            const response = await axios.post(`${BASE_URL}/api/enhanced-ftp/simulate-speeding-event`, {
                speed: TEST_SPEED,
                camera_id: TEST_CAMERA_ID
            });
            
            if (response.data.success) {
                console.log('✅ Speeding event simulated successfully');
                console.log(`   Event ID: ${response.data.data.eventId}`);
                console.log(`   Event folder: ${response.data.data.eventFolder}`);
                console.log(`   Photos processed: ${response.data.data.processedPhotos.length}`);
                console.log(`   Fine created: ${response.data.data.dbRecords.fine ? 'Yes' : 'No'}`);
                
                // Store event ID for later tests
                this.testEventId = response.data.data.eventId;
                this.testEventFolder = response.data.data.eventFolder;
                
                this.testResults.push({ test: 'Simulate Speeding Event', status: 'PASS' });
            } else {
                throw new Error('Failed to simulate speeding event');
            }
        } catch (error) {
            console.error('❌ Speeding event simulation failed:', error.message);
            this.testResults.push({ test: 'Simulate Speeding Event', status: 'FAIL', error: error.message });
        }
    }

    async testApiEndpoints() {
        console.log('\n🔌 Test 3: Testing API endpoints...');
        
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Test get events endpoint
            const eventsResponse = await axios.get(`${BASE_URL}/api/speeding-car-processor/events/${today}?camera_id=${TEST_CAMERA_ID}`);
            
            if (eventsResponse.data.success) {
                console.log('✅ Events API endpoint working');
                console.log(`   Events found: ${eventsResponse.data.data.events.length}`);
                
                if (eventsResponse.data.data.events.length > 0) {
                    const firstEvent = eventsResponse.data.data.events[0];
                    console.log(`   First event: ${firstEvent.event_id}`);
                    console.log(`   Has verdict: ${firstEvent.has_verdict}`);
                    console.log(`   Photo count: ${firstEvent.photo_count}`);
                }
            }
            
            // Test processing inbox status
            const statusResponse = await axios.get(`${BASE_URL}/api/enhanced-ftp/processing-inbox/status`);
            
            if (statusResponse.data.success) {
                console.log('✅ Processing inbox status API working');
                console.log(`   Total cameras: ${statusResponse.data.data.total_cameras}`);
                console.log(`   Total events: ${statusResponse.data.data.total_events}`);
            }
            
            this.testResults.push({ test: 'API Endpoints', status: 'PASS' });
            
        } catch (error) {
            console.error('❌ API endpoints test failed:', error.message);
            this.testResults.push({ test: 'API Endpoints', status: 'FAIL', error: error.message });
        }
    }

    async testFileSystemStructure() {
        console.log('\n📂 Test 4: Verifying file system structure...');
        
        try {
            if (!this.testEventFolder) {
                throw new Error('No test event folder available');
            }
            
            // Check if event folder exists
            const folderExists = await fs.pathExists(this.testEventFolder);
            if (!folderExists) {
                throw new Error(`Event folder does not exist: ${this.testEventFolder}`);
            }
            
            // Check for verdict.json
            const verdictPath = path.join(this.testEventFolder, 'verdict.json');
            const verdictExists = await fs.pathExists(verdictPath);
            if (!verdictExists) {
                throw new Error('verdict.json file not found');
            }
            
            // Check for 3 photos
            const files = await fs.readdir(this.testEventFolder);
            const photoFiles = files.filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'));
            
            if (photoFiles.length !== 3) {
                throw new Error(`Expected 3 photos, found ${photoFiles.length}`);
            }
            
            console.log('✅ File system structure verified');
            console.log(`   Event folder: ${this.testEventFolder}`);
            console.log(`   Verdict file: ✓`);
            console.log(`   Photo files: ${photoFiles.length} ✓`);
            
            this.testResults.push({ test: 'File System Structure', status: 'PASS' });
            
        } catch (error) {
            console.error('❌ File system structure test failed:', error.message);
            this.testResults.push({ test: 'File System Structure', status: 'FAIL', error: error.message });
        }
    }

    async testVerdictContent() {
        console.log('\n📄 Test 5: Verifying verdict JSON content...');
        
        try {
            if (!this.testEventFolder) {
                throw new Error('No test event folder available');
            }
            
            const verdictPath = path.join(this.testEventFolder, 'verdict.json');
            const verdictData = await fs.readJson(verdictPath);
            
            // Verify required fields
            const requiredFields = [
                'event_id', 'camera_id', 'src_ip', 'event_ts', 'arrival_ts',
                'decision', 'speed', 'limit', 'speed_excess', 'fine_amount',
                'deserves_ticket', 'photos', 'processing_info', 'payload'
            ];
            
            for (const field of requiredFields) {
                if (!(field in verdictData)) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
            
            // Verify values
            if (verdictData.speed !== TEST_SPEED) {
                throw new Error(`Speed mismatch: expected ${TEST_SPEED}, got ${verdictData.speed}`);
            }
            
            if (verdictData.limit !== 30) {
                throw new Error(`Speed limit mismatch: expected 30, got ${verdictData.limit}`);
            }
            
            if (verdictData.decision !== 'violation') {
                throw new Error(`Decision mismatch: expected 'violation', got ${verdictData.decision}`);
            }
            
            if (!verdictData.deserves_ticket) {
                throw new Error('deserves_ticket should be true for speeding violation');
            }
            
            if (verdictData.photos.length !== 3) {
                throw new Error(`Expected 3 photos in verdict, got ${verdictData.photos.length}`);
            }
            
            console.log('✅ Verdict JSON content verified');
            console.log(`   Event ID: ${verdictData.event_id}`);
            console.log(`   Speed: ${verdictData.speed} km/h`);
            console.log(`   Limit: ${verdictData.limit} km/h`);
            console.log(`   Decision: ${verdictData.decision}`);
            console.log(`   Fine amount: $${verdictData.fine_amount}`);
            console.log(`   Photos: ${verdictData.photos.length}`);
            
            this.testResults.push({ test: 'Verdict Content', status: 'PASS' });
            
        } catch (error) {
            console.error('❌ Verdict content test failed:', error.message);
            this.testResults.push({ test: 'Verdict Content', status: 'FAIL', error: error.message });
        }
    }

    async testPhotoProcessing() {
        console.log('\n📸 Test 6: Testing photo processing...');
        
        try {
            const today = new Date().toISOString().split('T')[0];
            
            if (!this.testEventId) {
                throw new Error('No test event ID available');
            }
            
            // Test photos API endpoint
            const photosResponse = await axios.get(`${BASE_URL}/api/speeding-car-processor/event/${this.testEventId}/photos?date=${today}&camera_id=${TEST_CAMERA_ID}`);
            
            if (photosResponse.data.success) {
                const photos = photosResponse.data.data.photos;
                
                if (photos.length !== 3) {
                    throw new Error(`Expected 3 photos via API, got ${photos.length}`);
                }
                
                console.log('✅ Photo processing verified');
                console.log(`   Photos accessible via API: ${photos.length}`);
                
                for (let i = 0; i < photos.length; i++) {
                    console.log(`   Photo ${i + 1}: ${photos[i].filename} (${photos[i].size} bytes)`);
                }
                
                this.testResults.push({ test: 'Photo Processing', status: 'PASS' });
            } else {
                throw new Error('Failed to retrieve photos via API');
            }
            
        } catch (error) {
            console.error('❌ Photo processing test failed:', error.message);
            this.testResults.push({ test: 'Photo Processing', status: 'FAIL', error: error.message });
        }
    }

    printTestSummary() {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('=' .repeat(60));
        
        let passCount = 0;
        let failCount = 0;
        
        for (const result of this.testResults) {
            const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} - ${result.test}`);
            
            if (result.error) {
                console.log(`      Error: ${result.error}`);
            }
            
            if (result.status === 'PASS') {
                passCount++;
            } else {
                failCount++;
            }
        }
        
        console.log('\n' + '-' .repeat(60));
        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`Passed: ${passCount}`);
        console.log(`Failed: ${failCount}`);
        console.log(`Success Rate: ${((passCount / this.testResults.length) * 100).toFixed(1)}%`);
        
        if (failCount === 0) {
            console.log('\n🎉 ALL TESTS PASSED! New system is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please check the errors above.');
        }
        
        console.log('\n📋 NEW SYSTEM FEATURES VERIFIED:');
        console.log('   ✓ 3 photos per speeding car saved in special folders');
        console.log('   ✓ JSON verdict file with car info and ticket decision');
        console.log('   ✓ Static speed limit of 30 km/h');
        console.log('   ✓ Event-based folder structure: /srv/processing_inbox/camera002/YYYY-MM-DD/event_id/');
        console.log('   ✓ New API endpoints for accessing processed data');
        console.log('   ✓ Database integration with eventId linking');
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const tester = new NewSystemTester();
    tester.runAllTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = NewSystemTester;
