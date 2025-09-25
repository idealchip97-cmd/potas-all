# Deployment Guide for Potassium Backend

This guide will help you deploy the Potassium Backend project on a Linux server or any production environment.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MySQL database server
- Git

## Step 1: Clone and Setup

```bash
# Clone the repository
git clone <your-repository-url>
cd potassium-backend-

# Install dependencies
npm install
```

## Step 2: Environment Configuration

### Create .env file
Copy the example environment file and configure it:

```bash
cp .env.example .env
```

### Required Environment Variables

Edit the `.env` file with your specific configuration:

```bash
# Database Configuration (REQUIRED)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=radar_speed_detection
DB_USER=root
DB_PASSWORD=your_database_password

# JWT Configuration (REQUIRED)
JWT_SECRET=your_super_secret_jwt_key_here_at_least_32_characters_long
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=production

# AI Services Configuration (Optional)
OPENAI_API_KEY=your_openai_api_key_here

# External Data Services Configuration (Optional)
FTP_HOST=192.186.1.14
FTP_PORT=21
FTP_USER=anonymous
FTP_PASSWORD=anonymous@

UDP_HOST=192.186.1.14
UDP_PORT=17081
UDP_LOCAL_PORT=17081

AUTO_START_EXTERNAL_DATA=false

# Advanced Plate Recognition Settings (Optional)
PLATE_RECOGNITION_ENGINE=enhanced
FALLBACK_TO_MOCK=true
TESSERACT_TIMEOUT=30000
CHATGPT_TIMEOUT=30000
```

### Critical Configuration Notes

1. **JWT_SECRET**: This MUST be set for production. Generate a secure random string:
   ```bash
   # Generate a secure JWT secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Database**: Ensure your MySQL database is running and accessible with the provided credentials.

3. **OpenAI API Key**: Only required if you want to use real AI-powered plate recognition.

## Step 3: Database Setup

```bash
# Create database (if it doesn't exist)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS radar_speed_detection;"

# Run database migrations and seed data
npm run seed
```

## Step 4: Test the Configuration

```bash
# Start the server in development mode first
npm run dev
```

Check the console output for any warnings about missing environment variables.

## Step 5: Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start server.js --name "potassium-backend"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using systemd (Alternative)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/potassium-backend.service
```

Add the following content:

```ini
[Unit]
Description=Potassium Backend API
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/potassium-backend-
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable potassium-backend
sudo systemctl start potassium-backend
sudo systemctl status potassium-backend
```

## Step 6: Verify Deployment

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Test authentication
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@potasfactory.com","password":"admin123"}'
```

### Check Logs

```bash
# PM2 logs
pm2 logs potassium-backend

# systemd logs
sudo journalctl -u potassium-backend -f
```

## Troubleshooting

### Common Issues

1. **JWT Error: "secretOrPrivateKey must have a value"**
   - Ensure `JWT_SECRET` is set in your `.env` file
   - The application will generate a warning and use a fallback secret

2. **Database Connection Error**
   - Verify MySQL is running: `sudo systemctl status mysql`
   - Check database credentials in `.env` file
   - Ensure database exists: `mysql -u root -p -e "SHOW DATABASES;"`

3. **Port Already in Use**
   - Change the `PORT` in `.env` file
   - Or kill the process using the port: `sudo lsof -ti:3000 | xargs kill -9`

4. **Permission Errors**
   - Ensure the user has read/write permissions to the project directory
   - Check file ownership: `ls -la`

### Environment Validation

The server performs automatic environment validation on startup and will show warnings for missing configuration. Pay attention to these warnings in the console output.

## Security Considerations

1. **Never commit `.env` file** to version control
2. **Use strong JWT secrets** (at least 32 characters)
3. **Set up firewall rules** to restrict access to necessary ports only
4. **Use HTTPS** in production with a reverse proxy like Nginx
5. **Regularly update dependencies**: `npm audit fix`

## Monitoring

Consider setting up monitoring for:
- Application logs
- Database performance
- API response times
- System resources (CPU, memory, disk)

## Linux Server Configuration (Confirmed Working)

Based on successful deployment testing, here are the confirmed working configurations:

### Confirmed Paths
- **FTP Images Directory**: `/srv/camera_uploads/camera001/192.168.1.54/2025-09-25/Common`
- **UDP Port**: 17081 (tested with `nc -u -l -p 17081`)
- **Server Environment**: idealchip@idealchip-ThinkPad-E15

### Recommended .env for Linux Server
```bash
# Confirmed working configuration
IMAGE_BASE_DIR=/srv/camera_uploads
UDP_LOCAL_PORT=17081
FTP_HOST=192.186.1.14
FTP_PORT=21

# Generate a secure JWT secret
JWT_SECRET=your_generated_64_character_secret_here
```

### Directory Structure Verification
Ensure your Linux server has the following directory structure:
```
/srv/camera_uploads/
├── camera001/
│   └── 192.168.1.54/
│       └── 2025-09-25/
│           └── Common/
│               └── [image files]
```

### Testing UDP Connection
```bash
# Test UDP port is listening (run this on your server)
nc -u -l -p 17081

# Test from another terminal or machine
echo "test message" | nc -u your-server-ip 17081
```

## Support

If you encounter issues during deployment:
1. Check the application logs for detailed error messages
2. Verify all environment variables are correctly set
3. Ensure all dependencies are installed
4. Check database connectivity and permissions
5. Verify directory permissions for `/srv/camera_uploads`
6. Test UDP port availability with `netstat -ulnp | grep 17081`

For additional support, refer to the project documentation or contact the development team.
