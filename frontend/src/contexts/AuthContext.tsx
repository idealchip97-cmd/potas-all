import * as React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Session timeout duration (30 minutes)
  const SESSION_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  // Function to start session timeout
  const startSessionTimeout = React.useCallback(() => {
    // Clear existing timeout
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    
    // Set new timeout
    const timeoutId = setTimeout(() => {
      console.log('🕐 Session timeout - automatically logging out');
      logout();
      alert('Your session has expired. Please log in again.');
    }, SESSION_TIMEOUT_DURATION);
    
    setSessionTimeout(timeoutId);
    
    // Store session start time
    localStorage.setItem('sessionStartTime', Date.now().toString());
  }, [sessionTimeout]);

  // Function to reset session timeout (extend session)
  const resetSessionTimeout = React.useCallback(() => {
    if (token && user) {
      startSessionTimeout();
    }
  }, [token, user, startSessionTimeout]);

  // Function to check if session is expired
  const checkSessionExpiry = React.useCallback(() => {
    const sessionStartTime = localStorage.getItem('sessionStartTime');
    if (sessionStartTime) {
      const elapsed = Date.now() - parseInt(sessionStartTime);
      if (elapsed > SESSION_TIMEOUT_DURATION) {
        console.log('🕐 Session expired on page load');
        logout();
        return true;
      }
    }
    return false;
  }, [SESSION_TIMEOUT_DURATION]);

  useEffect(() => {
    // Check for stored auth data on app load
    console.log('Auth: Checking for stored authentication');
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    console.log('Auth: Stored token exists:', !!storedToken);
    console.log('Auth: Stored user exists:', !!storedUser);
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('Auth: Restoring session for', userData.email);
        console.log('Auth: User data:', userData);
        
        // Check if session has expired
        if (checkSessionExpiry()) {
          console.log('Auth: Session expired, not restoring');
          setIsLoading(false);
          return;
        }
        
        // Validate token with backend if it's not a demo token
        if (!storedToken.startsWith('demo_token_')) {
          validateStoredToken(storedToken, userData);
        } else {
          // Demo token, restore immediately and start timeout
          setToken(storedToken);
          setUser(userData);
          startSessionTimeout();
          console.log('Auth: Demo session restored, setting isLoading to false');
          setIsLoading(false);
        }
        
      } catch (error) {
        console.error('Auth: Error parsing stored user data', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setIsLoading(false);
      }
    } else {
      console.log('Auth: No stored authentication found');
      setIsLoading(false);
    }

    async function validateStoredToken(token: string, userData: User) {
      try {
        // Import API service dynamically
        const { default: apiService } = await import('../services/api');
        
        // Try to make an authenticated request to validate the token
        const response = await apiService.getDashboardStats();
        
        if (response.success) {
          // If successful, restore the session and start timeout
          setToken(token);
          setUser(userData);
          startSessionTimeout();
          console.log('Auth: Token validated, session restored');
        } else {
          throw new Error('Dashboard stats request failed');
        }
      } catch (error) {
        console.warn('Auth: Stored token is invalid, clearing session', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        // Don't set user/token to null here as they're already null
      } finally {
        setIsLoading(false);
      }
    }

    // Failsafe: ensure loading state doesn't persist indefinitely
    const failsafeTimeout = setTimeout(() => {
      console.log('Auth: Failsafe timeout - forcing isLoading to false');
      setIsLoading(false);
    }, 5000);

    return () => {
      clearTimeout(failsafeTimeout);
    };
  }, []);


  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('🔐 Login attempt for:', email);
    
    try {
      setIsLoading(true);
      
      // Import API service dynamically to avoid circular dependencies
      const { default: apiService } = await import('../services/api');
      
      // Try to authenticate with the backend API
      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        const { token, user } = response.data;
        
        console.log('✅ Backend authentication successful for:', user.email);
        
        // Save to localStorage first
        try {
          localStorage.setItem('authToken', token);
          localStorage.setItem('user', JSON.stringify(user));
          console.log('✅ Login successful - Session saved to localStorage');
        } catch (storageError) {
          console.warn('⚠️ Could not save to localStorage:', storageError);
        }
        
        // Set state after localStorage is saved
        setToken(token);
        setUser(user);
        
        // Start session timeout
        startSessionTimeout();
        
        console.log('✅ Login successful - State updated');
        return true;
      } else {
        console.log('❌ Backend authentication failed:', response.message || 'Invalid credentials');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      // Fallback to demo accounts if backend is not available or rate limited
      if (error.code === 'ECONNREFUSED' || 
          error.message?.includes('Network Error') ||
          error.status === 429 ||
          error.response?.status === 429) {
        
        if (error.status === 429 || error.response?.status === 429) {
          console.log('🚫 Backend rate limited (HTTP 429) - too many requests, using demo accounts...');
        } else {
          console.log('🔄 Backend unavailable, trying demo accounts...');
        }
        
        const validCredentials = [
          { email: 'admin@potasfactory.com', password: 'admin123', role: 'admin' },
          { email: 'operator@potasfactory.com', password: 'operator123', role: 'operator' },
          { email: 'viewer@potasfactory.com', password: 'viewer123', role: 'viewer' },
        ];
        
        const account = validCredentials.find(acc => 
          acc.email.toLowerCase() === email.toLowerCase() && 
          acc.password === password
        );
        
        if (account) {
          const authToken = `demo_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const userData: User = {
            id: 1,
            email: account.email,
            firstName: account.role.charAt(0).toUpperCase() + account.role.slice(1),
            lastName: 'User',
            role: account.role as 'admin' | 'operator' | 'viewer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          localStorage.setItem('authToken', authToken);
          localStorage.setItem('user', JSON.stringify(userData));
          setToken(authToken);
          setUser(userData);
          
          // Start session timeout for demo login
          startSessionTimeout();
          
          console.log('✅ Demo login successful');
          return true;
        }
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear session timeout
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionStartTime');
    
    console.log('🚪 Logout completed - session cleared');
  };

  // Calculate authentication status more reliably
  const isAuthenticated = React.useMemo(() => {
    const hasToken = !!token;
    const hasUser = !!user;
    const hasStoredToken = !!localStorage.getItem('authToken');
    const hasStoredUser = !!localStorage.getItem('user');
    
    const authenticated = (hasToken && hasUser) || (hasStoredToken && hasStoredUser);
    
    console.log('Auth: isAuthenticated calculation:', {
      hasToken,
      hasUser,
      hasStoredToken,
      hasStoredUser,
      authenticated
    });
    
    return authenticated;
  }, [token, user]);

  // Add user activity detection to extend session
  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleUserActivity = () => {
      resetSessionTimeout();
    };

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      // Clean up event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [isAuthenticated, resetSessionTimeout]);

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated,
    isLoading,
    resetSessionTimeout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
