import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { 
  AdminPanelSettings, 
  Engineering, 
  Visibility 
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import usePermissions from '../hooks/usePermissions';

const RoleIndicator: React.FC = () => {
  const { user } = useAuth();
  const permissions = usePermissions();

  if (!user) return null;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <AdminPanelSettings />;
      case 'operator':
        return <Engineering />;
      case 'viewer':
        return <Visibility />;
      default:
        return <Visibility />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error' as const;
      case 'operator':
        return 'warning' as const;
      case 'viewer':
        return 'info' as const;
      default:
        return 'default' as const;
    }
  };

  const getPermissionSummary = () => {
    const perms = [];
    if (permissions.canEditFines) perms.push('Edit Fines');
    if (permissions.canDeleteFines) perms.push('Delete Fines');
    if (permissions.canApprovePlates) perms.push('Approve Plates');
    if (permissions.canDenyPlates) perms.push('Deny Plates');
    if (permissions.canEditRadars) perms.push('Manage Radars');
    
    return perms.length > 0 ? perms.join(', ') : 'View Only';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Chip
        icon={getRoleIcon(user.role)}
        label={`${user.role.toUpperCase()}: ${user.firstName} ${user.lastName}`}
        color={getRoleColor(user.role)}
        variant="outlined"
      />
      <Typography variant="caption" color="text.secondary">
        Permissions: {getPermissionSummary()}
      </Typography>
    </Box>
  );
};

export default RoleIndicator;
