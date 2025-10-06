import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user, token } = useAuth();

  console.log('ProtectedRoute: isLoading:', isLoading);
  console.log('ProtectedRoute: isAuthenticated:', isAuthenticated);
  console.log('ProtectedRoute: user exists:', !!user);
  console.log('ProtectedRoute: token exists:', !!token);

  // Show loading while authentication is being checked
  if (isLoading) {
    console.log('ProtectedRoute: Still loading authentication state');
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Double-check localStorage as fallback
  const storedToken = localStorage.getItem('authToken');
  const storedUser = localStorage.getItem('user');
  
  if (!isAuthenticated && (!storedToken || !storedUser)) {
    console.log('ProtectedRoute: Not authenticated and no stored credentials, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated && storedToken && storedUser) {
    console.log('ProtectedRoute: Found stored credentials but not authenticated, showing loading');
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  console.log('ProtectedRoute: Authenticated, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;
