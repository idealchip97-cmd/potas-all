import React from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import { useAuth } from '../contexts/SimpleAuthContext';
import { useNavigate } from 'react-router-dom';

const AuthTest: React.FC = () => {
  const { user, token, isAuthenticated, isLoading, login, logout } = useAuth();
  const navigate = useNavigate();

  const handleTestLogin = async () => {
    const success = await login('admin@potasfactory.com', 'admin123');
    console.log('Test login result:', success);
  };

  const handleLogout = () => {
    logout();
    console.log('Logged out');
  };

  const handleNavigateToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Authentication Test Page
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Current Auth State
        </Typography>
        
        <Typography><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</Typography>
        <Typography><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</Typography>
        <Typography><strong>Token Exists:</strong> {token ? 'Yes' : 'No'}</Typography>
        <Typography><strong>User Exists:</strong> {user ? 'Yes' : 'No'}</Typography>
        
        {user && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">User Details:</Typography>
            <Typography>Email: {user.email}</Typography>
            <Typography>Name: {user.firstName} {user.lastName}</Typography>
            <Typography>Role: {user.role}</Typography>
          </Box>
        )}
        
        {token && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Token:</Typography>
            <Typography sx={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
              {token}
            </Typography>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          LocalStorage Debug
        </Typography>
        
        <Typography>
          <strong>Stored Token:</strong> {localStorage.getItem('authToken') || 'None'}
        </Typography>
        <Typography>
          <strong>Stored User:</strong> {localStorage.getItem('user') || 'None'}
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={handleTestLogin}>
          Test Login (Admin)
        </Button>
        
        <Button variant="outlined" onClick={handleLogout}>
          Logout
        </Button>
        
        <Button variant="contained" color="secondary" onClick={handleNavigateToDashboard}>
          Go to Dashboard
        </Button>
        
        <Button 
          variant="outlined" 
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
        >
          Clear Storage & Reload
        </Button>
      </Box>

      {!isAuthenticated && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          You are not authenticated. Try the "Test Login" button above.
        </Alert>
      )}

      {isAuthenticated && (
        <Alert severity="success" sx={{ mt: 3 }}>
          You are authenticated! You should be able to access protected routes.
        </Alert>
      )}
    </Box>
  );
};

export default AuthTest;
