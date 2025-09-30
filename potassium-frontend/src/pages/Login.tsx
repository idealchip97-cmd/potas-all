import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/SimpleAuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    console.log('Login: useEffect - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
    if (!isLoading && isAuthenticated) {
      console.log('Login: Already authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🔐 Attempting login with:', email);

    try {
      const success = await login(email, password);
      
      if (success) {
        console.log('✅ Login successful - Redirecting to dashboard');
        // Force navigation after a short delay to ensure state is set
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      } else {
        console.log('❌ Login failed - Invalid credentials');
        setError('Invalid email or password. Try: admin@potasfactory.com / admin123');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'admin@potasfactory.com', password: 'admin123', role: 'Admin' },
    { email: 'operator@potasfactory.com', password: 'operator123', role: 'Operator' },
    { email: 'viewer@potasfactory.com', password: 'viewer123', role: 'Viewer' },
  ];

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4" gutterBottom>
              Radar Control System
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Potassium Factory Speed Detection
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Demo Accounts
            </Typography>
            {demoAccounts.map((account) => (
              <Card key={account.role} sx={{ mb: 1 }}>
                <CardContent sx={{ py: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2">{account.role}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {account.email}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={() => handleDemoLogin(account.email, account.password)}
                    >
                      Use Account
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
