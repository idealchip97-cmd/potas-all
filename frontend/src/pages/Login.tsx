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
  Fade,
  Slide,
  Zoom,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { keyframes } from '@mui/system';

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
        // Force navigation after a longer delay to ensure state is properly set
        setTimeout(() => {
          console.log('🔄 Navigating to dashboard...');
          navigate('/dashboard', { replace: true });
        }, 300);
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

  const handleAutoLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      console.log('🚀 Auto-login: Attempting admin authentication...');
      const success = await login('admin@potasfactory.com', 'admin123');
      
      if (success) {
        console.log('✅ Auto-login successful');
        navigate('/dashboard', { replace: true });
      } else {
        setError('Auto-login failed. Please try manual login.');
      }
    } catch (err) {
      console.error('❌ Auto-login error:', err);
      setError('Auto-login failed. Please try manual login.');
    } finally {
      setLoading(false);
    }
  };

  // Animation keyframes
  const floatAnimation = keyframes`
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  `;

  const pulseAnimation = keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  `;

  const shimmerAnimation = keyframes`
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  `;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 25%, #3d7eaa 50%, #50a3ba 75%, #63c8cc 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)
          `,
          animation: `${floatAnimation} 6s ease-in-out infinite`,
        },
      }}
    >
      <Container component="main" maxWidth="sm">
        <Fade in timeout={1000}>
          <Paper 
            elevation={24}
            sx={{ 
              padding: 5,
              width: '100%',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '2px',
                background: `linear-gradient(90deg, transparent, #3d7eaa, transparent)`,
                animation: `${shimmerAnimation} 3s infinite`,
              }
            }}
          >
            {/* Company Logos - Vertical Layout */}
            <Slide direction="down" in timeout={1200}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                {/* Arab Potash Logo - Top */}
                <Zoom in timeout={1500}>
                  <Box sx={{ mb: 3 }}>
                    <img 
                      src="/arab_potash-logo-en.png" 
                      alt="Arab Potash Company Logo" 
                      style={{ 
                        height: '93px', // 55% larger than 60px
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
                        transition: 'all 0.3s ease',
                        animation: `${pulseAnimation} 4s ease-in-out infinite`,
                      }}
                    />
                  </Box>
                </Zoom>
                {/* Ideal Chip Logo - Bottom */}
                <Zoom in timeout={1700}>
                  <Box>
                    <img 
                      src="/idealchip-logo.png" 
                      alt="Ideal Chip Logo" 
                      style={{ 
                        height: '93px', // 55% larger than 60px
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
                        transition: 'all 0.3s ease',
                        animation: `${pulseAnimation} 4s ease-in-out infinite 0.5s`,
                      }}
                    />
                  </Box>
                </Zoom>
              </Box>
            </Slide>

            {/* Title Section */}
            <Slide direction="up" in timeout={1400}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography 
                  component="h1" 
                  variant="h3" 
                  gutterBottom
                  sx={{
                    background: 'linear-gradient(45deg, #1e3c72, #3d7eaa, #50a3ba)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  Radar Control System
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{
                    color: '#4a5568',
                    fontWeight: 500,
                    opacity: 0.8,
                  }}
                >
                  🏭 Potassium Factory Speed Detection
                </Typography>
                <Box
                  sx={{
                    width: '60px',
                    height: '4px',
                    background: 'linear-gradient(45deg, #3d7eaa, #50a3ba)',
                    margin: '16px auto',
                    borderRadius: '2px',
                    animation: `${shimmerAnimation} 2s infinite`,
                  }}
                />
              </Box>
            </Slide>

            {/* Error Alert */}
            {error && (
              <Slide direction="left" in timeout={500}>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      animation: `${pulseAnimation} 2s infinite`,
                    }
                  }}
                >
                  {error}
                </Alert>
              </Slide>
            )}

            {/* Login Form */}
            <Fade in timeout={1600}>
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(61, 126, 170, 0.15)',
                      },
                      '&.Mui-focused': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(61, 126, 170, 0.25)',
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#3d7eaa',
                    },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3d7eaa',
                      borderWidth: 2,
                    }
                  }}
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(61, 126, 170, 0.15)',
                      },
                      '&.Mui-focused': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(61, 126, 170, 0.25)',
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#3d7eaa',
                    },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3d7eaa',
                      borderWidth: 2,
                    }
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{ 
                    mt: 4, 
                    mb: 2,
                    height: 56,
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #1e3c72, #3d7eaa)',
                    boxShadow: '0 4px 15px rgba(61, 126, 170, 0.4)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #2a5298, #50a3ba)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(61, 126, 170, 0.6)',
                    },
                    '&:active': {
                      transform: 'translateY(0px)',
                    },
                    '&:disabled': {
                      background: 'linear-gradient(45deg, #9ca3af, #d1d5db)',
                    }
                  }}
                >
                  {loading ? (
                    <CircularProgress 
                      size={24} 
                      sx={{ 
                        color: 'white',
                        animation: `${pulseAnimation} 1s infinite`,
                      }} 
                    />
                  ) : (
                    '🚀 Sign In to Control Center'
                  )}
                </Button>
              </Box>
            </Fade>

            {/* Decorative Elements */}
            <Box
              sx={{
                position: 'absolute',
                bottom: -50,
                right: -50,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'linear-gradient(45deg, rgba(61, 126, 170, 0.1), rgba(80, 163, 186, 0.1))',
                animation: `${floatAnimation} 8s ease-in-out infinite`,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: -30,
                left: -30,
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'linear-gradient(45deg, rgba(80, 163, 186, 0.1), rgba(99, 200, 204, 0.1))',
                animation: `${floatAnimation} 6s ease-in-out infinite reverse`,
              }}
            />
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default Login;
