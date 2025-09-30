import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  Notifications,
  AccountCircle,
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/SimpleAuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { user } = useAuth();

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Potassium Factory - Radar Speed Detection System
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`Role: ${user?.role?.toUpperCase()}`}
            color="secondary"
            variant="outlined"
            size="small"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={toggleDarkMode}
                icon={<Brightness7 />}
                checkedIcon={<Brightness4 />}
              />
            }
            label=""
          />
          
          <IconButton color="inherit">
            <Notifications />
          </IconButton>
          
          <IconButton color="inherit">
            <AccountCircle />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
