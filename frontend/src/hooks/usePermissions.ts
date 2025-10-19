import { useAuth } from '../contexts/AuthContext';

export interface Permissions {
  // General permissions
  canViewDashboard: boolean;
  canViewRadars: boolean;
  canViewFines: boolean;
  canViewPlateRecognition: boolean;
  
  // Admin-only permissions
  canEditRadars: boolean;
  canDeleteRadars: boolean;
  canAddRadars: boolean;
  
  // Fines permissions
  canEditFines: boolean;
  canDeleteFines: boolean;
  canViewFineDetails: boolean;
  
  // Plate recognition permissions
  canApprovePlates: boolean;
  canDenyPlates: boolean;
  
  // System permissions
  canManageUsers: boolean;
  canViewSystemSettings: boolean;
}

export const usePermissions = (): Permissions => {
  const { user } = useAuth();
  
  if (!user) {
    // No permissions for unauthenticated users
    return {
      canViewDashboard: false,
      canViewRadars: false,
      canViewFines: false,
      canViewPlateRecognition: false,
      canEditRadars: false,
      canDeleteRadars: false,
      canAddRadars: false,
      canEditFines: false,
      canDeleteFines: false,
      canViewFineDetails: false,
      canApprovePlates: false,
      canDenyPlates: false,
      canManageUsers: false,
      canViewSystemSettings: false,
    };
  }

  const isAdmin = user.role === 'admin';
  const isOperator = user.role === 'operator';
  const isViewer = user.role === 'viewer';

  return {
    // General permissions - all authenticated users can view
    canViewDashboard: true,
    canViewRadars: true,
    canViewFines: true,
    canViewPlateRecognition: true,
    
    // Admin-only permissions
    canEditRadars: isAdmin,
    canDeleteRadars: isAdmin,
    canAddRadars: isAdmin,
    
    // Fines permissions
    canEditFines: isAdmin, // Only admin can edit fines
    canDeleteFines: isAdmin, // Only admin can delete fines
    canViewFineDetails: true, // All can view details
    
    // Plate recognition permissions
    canApprovePlates: isAdmin || isOperator, // Only admin and operator can approve
    canDenyPlates: isAdmin, // Only admin can deny plates
    
    // System permissions
    canManageUsers: isAdmin,
    canViewSystemSettings: isAdmin,
  };
};

export default usePermissions;
