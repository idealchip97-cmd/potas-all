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
        
        // Validate token with backend if it's not a demo token
        if (!storedToken.startsWith('demo_token_')) {
          validateStoredToken(storedToken, userData);
        } else {
          // Demo token, restore immediately
          setToken(storedToken);
          setUser(userData);
          setTimeout(() => {
            console.log('Auth: Demo session restored, setting isLoading to false');
            setIsLoading(false);
          }, 100);
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
        await apiService.getDashboardStats();
        
        // If successful, restore the session
        setToken(token);
        setUser(userData);
        console.log('Auth: Token validated, session restored');
      } catch (error) {
        console.warn('Auth: Stored token is invalid, clearing session');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
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
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
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

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
