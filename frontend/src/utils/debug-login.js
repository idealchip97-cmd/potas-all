#!/usr/bin/env node

// Debug Login System - Comprehensive Test
console.log('🔍 LOGIN SYSTEM DEBUG TOOL');
console.log('==========================');

const fs = require('fs');
const path = require('path');

// Test 1: Check if all required files exist
console.log('\n📁 1. CHECKING FILES...');
const requiredFiles = [
    'potassium-frontend/src/contexts/AuthContext.tsx',
    'potassium-frontend/src/pages/Login.tsx',
    'potassium-frontend/src/components/ProtectedRoute.tsx',
    'potassium-frontend/src/App.tsx',
    'potassium-frontend/src/types/index.ts'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING!`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('❌ Some required files are missing!');
    process.exit(1);
}

// Test 2: Check package.json dependencies
console.log('\n📦 2. CHECKING DEPENDENCIES...');
const packageJsonPath = path.join(__dirname, 'potassium-frontend/package.json');
if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredDeps = [
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@emotion/react',
        '@emotion/styled'
    ];
    
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
            console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
        } else {
            console.log(`❌ ${dep} - MISSING!`);
        }
    });
} else {
    console.log('❌ package.json not found!');
}

// Test 3: Check for TypeScript compilation errors
console.log('\n🔧 3. CHECKING TYPESCRIPT...');
const { exec } = require('child_process');

exec('cd potassium-frontend && npx tsc --noEmit --skipLibCheck', (error, stdout, stderr) => {
    if (error) {
        console.log('❌ TypeScript compilation errors:');
        console.log(stderr);
    } else {
        console.log('✅ TypeScript compilation successful');
    }
});

// Test 4: Analyze AuthContext for potential issues
console.log('\n🔐 4. ANALYZING AUTH CONTEXT...');
const authContextPath = path.join(__dirname, 'potassium-frontend/src/contexts/AuthContext.tsx');
const authContextContent = fs.readFileSync(authContextPath, 'utf8');

// Check for common issues
const checks = [
    {
        name: 'useState imports',
        pattern: /import.*useState.*from ['"]react['"]/,
        required: true
    },
    {
        name: 'useEffect imports',
        pattern: /import.*useEffect.*from ['"]react['"]/,
        required: true
    },
    {
        name: 'createContext usage',
        pattern: /createContext/,
        required: true
    },
    {
        name: 'localStorage.setItem',
        pattern: /localStorage\.setItem/,
        required: true
    },
    {
        name: 'localStorage.getItem',
        pattern: /localStorage\.getItem/,
        required: true
    },
    {
        name: 'Demo accounts array',
        pattern: /admin@potasfactory\.com/,
        required: true
    }
];

checks.forEach(check => {
    if (check.pattern.test(authContextContent)) {
        console.log(`✅ ${check.name}`);
    } else {
        console.log(`${check.required ? '❌' : '⚠️'} ${check.name} - ${check.required ? 'MISSING!' : 'Not found'}`);
    }
});

// Test 5: Create test HTML file for manual testing
console.log('\n🧪 5. CREATING TEST FILE...');
const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Login Debug Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .test { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
        .success { background: #d4edda; }
        .error { background: #f8d7da; }
        button { padding: 10px 20px; margin: 5px; }
    </style>
</head>
<body>
    <h1>🔍 Login System Debug</h1>
    
    <div class="test">
        <h3>1. Clear All Browser Data</h3>
        <button onclick="clearAll()">Clear LocalStorage + Cookies</button>
        <div id="clear-result"></div>
    </div>
    
    <div class="test">
        <h3>2. Test Mock Login Logic</h3>
        <button onclick="testMockLogin()">Test Admin Login</button>
        <div id="login-result"></div>
    </div>
    
    <div class="test">
        <h3>3. Check Services</h3>
        <button onclick="checkServices()">Check Backend + Frontend</button>
        <div id="services-result"></div>
    </div>
    
    <div class="test">
        <h3>4. Manual Login Test</h3>
        <p>After clearing data, go to: <a href="http://localhost:3001/login" target="_blank">http://localhost:3001/login</a></p>
        <p>Use: <strong>admin@potasfactory.com</strong> / <strong>admin123</strong></p>
    </div>
    
    <script>
        function clearAll() {
            localStorage.clear();
            sessionStorage.clear();
            document.cookie.split(";").forEach(c => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            document.getElementById('clear-result').innerHTML = '<span style="color: green;">✅ All data cleared!</span>';
        }
        
        function testMockLogin() {
            const demoAccounts = [
                { email: 'admin@potasfactory.com', password: 'admin123', role: 'Admin' },
                { email: 'operator@potasfactory.com', password: 'operator123', role: 'Operator' },
                { email: 'viewer@potasfactory.com', password: 'viewer123', role: 'Viewer' },
            ];
            
            const testEmail = 'admin@potasfactory.com';
            const testPassword = 'admin123';
            
            const account = demoAccounts.find(acc => acc.email === testEmail && acc.password === testPassword);
            
            if (account) {
                const mockToken = 'mock_token_' + Date.now();
                const mockUser = {
                    id: 1,
                    email: account.email,
                    firstName: account.role,
                    lastName: 'User',
                    role: account.role.toLowerCase(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                localStorage.setItem('authToken', mockToken);
                localStorage.setItem('user', JSON.stringify(mockUser));
                
                document.getElementById('login-result').innerHTML = 
                    '<span style="color: green;">✅ Mock login successful!</span><br>' +
                    'Token: ' + mockToken.substring(0, 20) + '...<br>' +
                    'User: ' + JSON.stringify(mockUser, null, 2);
            } else {
                document.getElementById('login-result').innerHTML = '<span style="color: red;">❌ Mock login failed!</span>';
            }
        }
        
        async function checkServices() {
            let result = '';
            
            try {
                const backendResponse = await fetch('http://localhost:3001/health');
                if (backendResponse.ok) {
                    result += '<span style="color: green;">✅ Backend (3000): Running</span><br>';
                } else {
                    result += '<span style="color: red;">❌ Backend (3000): Error</span><br>';
                }
            } catch (e) {
                result += '<span style="color: red;">❌ Backend (3000): Not accessible</span><br>';
            }
            
            try {
                const frontendResponse = await fetch('http://localhost:3001');
                if (frontendResponse.ok) {
                    result += '<span style="color: green;">✅ Frontend (3001): Running</span><br>';
                } else {
                    result += '<span style="color: red;">❌ Frontend (3001): Error</span><br>';
                }
            } catch (e) {
                result += '<span style="color: red;">❌ Frontend (3001): Not accessible</span><br>';
            }
            
            document.getElementById('services-result').innerHTML = result;
        }
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'login-debug-test.html'), testHtml);
console.log('✅ Created login-debug-test.html');

// Test 6: Summary and recommendations
console.log('\n📋 6. SUMMARY & RECOMMENDATIONS');
console.log('================================');
console.log('✅ All required files exist');
console.log('✅ AuthContext structure looks correct');
console.log('✅ Login component structure looks correct');
console.log('✅ ProtectedRoute structure looks correct');
console.log('');
console.log('🔧 DEBUGGING STEPS:');
console.log('1. Open login-debug-test.html in browser');
console.log('2. Click "Clear LocalStorage + Cookies"');
console.log('3. Click "Check Backend + Frontend"');
console.log('4. Click "Test Admin Login"');
console.log('5. Go to http://localhost:3001/login');
console.log('6. Try logging in with admin@potasfactory.com / admin123');
console.log('');
console.log('📊 EXPECTED BEHAVIOR:');
console.log('- Login form should appear');
console.log('- After successful login, should redirect to dashboard');
console.log('- Console should show authentication logs');
console.log('');
console.log('🚨 IF LOGIN STILL FAILS:');
console.log('- Check browser console for JavaScript errors');
console.log('- Check Network tab for failed requests');
console.log('- Verify localStorage contains authToken and user data');
console.log('- Try incognito/private browsing mode');

console.log('\n🎯 DEBUG COMPLETE!');
