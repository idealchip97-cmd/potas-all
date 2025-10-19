import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  TextField,
  Button,
  Avatar,
  Chip,
  Alert,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person,
  Security,
  Notifications,
  Palette,
  Save,
  RestartAlt,
  Brightness4,
  Brightness7,
  VolumeUp,
  Email,
  Sms,
  CameraAlt,
  Speed,
  Storage,
  Update,
  Warning,
  CheckCircle,
  Error,
  Delete,
  CloudDownload,
  CloudUpload,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User Settings State
  const [userSettings, setUserSettings] = useState({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@potash.com',
    phone: '+962-123-456789',
    language: 'en',
    timezone: 'Asia/Amman',
    theme: 'light',
    notifications: true,
    emailNotifications: true,
    smsNotifications: false,
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    dataRetention: 365,
    maxRadars: 50,
    speedThreshold: 10,
    alertVolume: 70,
    maintenanceMode: false,
    debugMode: false,
    autoUpdates: true,
  });

  // Radar Settings State
  const [radarSettings, setRadarSettings] = useState({
    defaultSpeedLimit: 50,
    violationThreshold: 5,
    imageQuality: 'high',
    recordingDuration: 30,
    nightVision: true,
    weatherCompensation: true,
    calibrationInterval: 30,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save settings');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = () => {
    // Reset to default values
    setUserSettings({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@potash.com',
      phone: '+962-123-456789',
      language: 'en',
      timezone: 'Asia/Amman',
      theme: 'light',
      notifications: true,
      emailNotifications: true,
      smsNotifications: false,
    });
    setSuccess('Settings reset to defaults');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <Box sx={{ 
      p: 3,
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        p: 3,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}>
            <SettingsIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold',
            }}>
              ⚙️ System Settings
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Configure your radar control system preferences
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RestartAlt />}
            onClick={handleResetSettings}
            sx={{ borderRadius: 2 }}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSaveSettings}
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
            }}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Box>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Settings Tabs */}
      <Paper sx={{ 
        mb: 4,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 72,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
            }
          }}
        >
          <Tab icon={<Person />} label="User Profile" />
          <Tab icon={<CameraAlt />} label="Radar Settings" />
          <Tab icon={<Notifications />} label="Notifications" />
          <Tab icon={<Palette />} label="Appearance" />
          <Tab icon={<Security />} label="Security" />
          <Tab icon={<Storage />} label="Data & Backup" />
          <Tab icon={<Update />} label="System" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      
      {/* User Profile Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '0 0 300px' }}>
            <Card sx={{ textAlign: 'center', p: 3 }}>
              <Avatar sx={{ 
                width: 120, 
                height: 120, 
                mx: 'auto', 
                mb: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontSize: '3rem'
              }}>
                {userSettings.firstName[0]}{userSettings.lastName[0]}
              </Avatar>
              <Typography variant="h6">
                {userSettings.firstName} {userSettings.lastName}
              </Typography>
              <Typography color="textSecondary" gutterBottom>
                System Administrator
              </Typography>
              <Chip 
                label="Active" 
                color="success" 
                size="small"
                sx={{ mt: 1 }}
              />
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 400px' }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Personal Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={userSettings.firstName}
                    onChange={(e) => setUserSettings({...userSettings, firstName: e.target.value})}
                  />
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={userSettings.lastName}
                    onChange={(e) => setUserSettings({...userSettings, lastName: e.target.value})}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={userSettings.email}
                    onChange={(e) => setUserSettings({...userSettings, email: e.target.value})}
                  />
                  <TextField
                    fullWidth
                    label="Phone"
                    value={userSettings.phone}
                    onChange={(e) => setUserSettings({...userSettings, phone: e.target.value})}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={userSettings.language}
                      label="Language"
                      onChange={(e) => setUserSettings({...userSettings, language: e.target.value})}
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="ar">العربية</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={userSettings.timezone}
                      label="Timezone"
                      onChange={(e) => setUserSettings({...userSettings, timezone: e.target.value})}
                    >
                      <MenuItem value="Asia/Amman">Asia/Amman (UTC+3)</MenuItem>
                      <MenuItem value="UTC">UTC</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>
      </TabPanel>

      {/* Radar Settings Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 400px' }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Speed sx={{ mr: 1, verticalAlign: 'middle' }} />
                Speed Detection
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography gutterBottom>Default Speed Limit (km/h)</Typography>
                <Slider
                  value={radarSettings.defaultSpeedLimit}
                  onChange={(e, value) => setRadarSettings({...radarSettings, defaultSpeedLimit: value as number})}
                  min={10}
                  max={120}
                  step={5}
                  marks
                  valueLabelDisplay="on"
                />
              </Box>
              <Box sx={{ mt: 3 }}>
                <Typography gutterBottom>Violation Threshold (km/h over limit)</Typography>
                <Slider
                  value={radarSettings.violationThreshold}
                  onChange={(e, value) => setRadarSettings({...radarSettings, violationThreshold: value as number})}
                  min={1}
                  max={20}
                  step={1}
                  marks
                  valueLabelDisplay="on"
                />
              </Box>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 400px' }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <CameraAlt sx={{ mr: 1, verticalAlign: 'middle' }} />
                Camera Settings
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Image Quality" />
                  <FormControl size="small">
                    <Select
                      value={radarSettings.imageQuality}
                      onChange={(e) => setRadarSettings({...radarSettings, imageQuality: e.target.value})}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="ultra">Ultra</MenuItem>
                    </Select>
                  </FormControl>
                </ListItem>
                <ListItem>
                  <ListItemText primary="Night Vision" />
                  <Switch
                    checked={radarSettings.nightVision}
                    onChange={(e) => setRadarSettings({...radarSettings, nightVision: e.target.checked})}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Weather Compensation" />
                  <Switch
                    checked={radarSettings.weatherCompensation}
                    onChange={(e) => setRadarSettings({...radarSettings, weatherCompensation: e.target.checked})}
                  />
                </ListItem>
              </List>
            </Card>
          </Box>
        </Box>
      </TabPanel>

      {/* Notifications Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 400px' }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
                Notification Preferences
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Email />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Email Notifications" 
                    secondary="Receive alerts via email"
                  />
                  <Switch
                    checked={userSettings.emailNotifications}
                    onChange={(e) => setUserSettings({...userSettings, emailNotifications: e.target.checked})}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Sms />
                  </ListItemIcon>
                  <ListItemText 
                    primary="SMS Notifications" 
                    secondary="Receive alerts via SMS"
                  />
                  <Switch
                    checked={userSettings.smsNotifications}
                    onChange={(e) => setUserSettings({...userSettings, smsNotifications: e.target.checked})}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <VolumeUp />
                  </ListItemIcon>
                  <ListItemText primary="Alert Volume" />
                  <Box sx={{ width: 100, ml: 2 }}>
                    <Slider
                      value={systemSettings.alertVolume}
                      onChange={(e, value) => setSystemSettings({...systemSettings, alertVolume: value as number})}
                      size="small"
                    />
                  </Box>
                </ListItem>
              </List>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 400px' }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Alert Types
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Speed Violations" 
                    secondary="Alert when speed limit exceeded"
                  />
                  <Switch defaultChecked />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Error color="error" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="System Errors" 
                    secondary="Alert on radar malfunctions"
                  />
                  <Switch defaultChecked />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Maintenance Reminders" 
                    secondary="Scheduled maintenance alerts"
                  />
                  <Switch defaultChecked />
                </ListItem>
              </List>
            </Card>
          </Box>
        </Box>
      </TabPanel>

      {/* Appearance Tab */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ maxWidth: 600 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
              Theme Settings
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  {userSettings.theme === 'light' ? <Brightness7 /> : <Brightness4 />}
                </ListItemIcon>
                <ListItemText 
                  primary="Dark Mode" 
                  secondary="Switch between light and dark themes"
                />
                <Switch
                  checked={userSettings.theme === 'dark'}
                  onChange={(e) => setUserSettings({...userSettings, theme: e.target.checked ? 'dark' : 'light'})}
                />
              </ListItem>
            </List>
          </Card>
        </Box>
      </TabPanel>

      {/* Security Tab */}
      <TabPanel value={tabValue} index={4}>
        <Box sx={{ maxWidth: 600 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
              Security Settings
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" fullWidth sx={{ mb: 2 }}>
                Change Password
              </Button>
              <Button variant="outlined" fullWidth sx={{ mb: 2 }}>
                Enable Two-Factor Authentication
              </Button>
              <Button variant="outlined" fullWidth>
                View Login History
              </Button>
            </Box>
          </Card>
        </Box>
      </TabPanel>

      {/* Data & Backup Tab */}
      <TabPanel value={tabValue} index={5}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 400px' }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Storage sx={{ mr: 1, verticalAlign: 'middle' }} />
                Backup Settings
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Automatic Backup" />
                  <Switch
                    checked={systemSettings.autoBackup}
                    onChange={(e) => setSystemSettings({...systemSettings, autoBackup: e.target.checked})}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Backup Frequency" />
                  <FormControl size="small">
                    <Select
                      value={systemSettings.backupFrequency}
                      onChange={(e) => setSystemSettings({...systemSettings, backupFrequency: e.target.value})}
                    >
                      <MenuItem value="hourly">Hourly</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                    </Select>
                  </FormControl>
                </ListItem>
              </List>
              <Box sx={{ mt: 2 }}>
                <Button variant="outlined" startIcon={<CloudDownload />} sx={{ mr: 1 }}>
                  Download Backup
                </Button>
                <Button variant="outlined" startIcon={<CloudUpload />}>
                  Upload Backup
                </Button>
              </Box>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 400px' }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Data Management
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography gutterBottom>Data Retention (days)</Typography>
                <Slider
                  value={systemSettings.dataRetention}
                  onChange={(e, value) => setSystemSettings({...systemSettings, dataRetention: value as number})}
                  min={30}
                  max={1095}
                  step={30}
                  marks={[
                    { value: 30, label: '30d' },
                    { value: 365, label: '1y' },
                    { value: 1095, label: '3y' }
                  ]}
                  valueLabelDisplay="on"
                />
              </Box>
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="textSecondary">
                  Storage Usage: 2.3 GB / 100 GB
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={23} 
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
            </Card>
          </Box>
        </Box>
      </TabPanel>

      {/* System Tab */}
      <TabPanel value={tabValue} index={6}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 400px' }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Update sx={{ mr: 1, verticalAlign: 'middle' }} />
                System Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="System Version" 
                    secondary="v2.1.0"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Last Update" 
                    secondary="October 19, 2025"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Automatic Updates" />
                  <Switch
                    checked={systemSettings.autoUpdates}
                    onChange={(e) => setSystemSettings({...systemSettings, autoUpdates: e.target.checked})}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Maintenance Mode" />
                  <Switch
                    checked={systemSettings.maintenanceMode}
                    onChange={(e) => setSystemSettings({...systemSettings, maintenanceMode: e.target.checked})}
                  />
                </ListItem>
              </List>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 400px' }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                System Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button variant="outlined" startIcon={<Update />}>
                  Check for Updates
                </Button>
                <Button variant="outlined" startIcon={<RestartAlt />}>
                  Restart System
                </Button>
                <Button variant="outlined" color="error" startIcon={<Delete />}>
                  Clear All Data
                </Button>
              </Box>
            </Card>
          </Box>
        </Box>
      </TabPanel>
    </Box>
  );
};

export default Settings;
