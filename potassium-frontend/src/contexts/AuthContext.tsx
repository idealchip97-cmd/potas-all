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
        
        // Set state synchronously to avoid race conditions
        setToken(storedToken);
        setUser(userData);
        
        // Add a small delay to ensure state is set before marking as loaded
        setTimeout(() => {
          console.log('Auth: Session restored, setting isLoading to false');
          setIsLoading(false);
        }, 100);
        
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
      
      // Simple demo accounts - always works
      const validCredentials = [
        { email: 'admin@potasfactory.com', password: 'admin123', role: 'admin' },
        { email: 'operator@potasfactory.com', password: 'operator123', role: 'operator' },
        { email: 'viewer@potasfactory.com', password: 'viewer123', role: 'viewer' },
      ];
      
      // Find matching credentials
      const account = validCredentials.find(acc => 
        acc.email.toLowerCase() === email.toLowerCase() && 
        acc.password === password
      );
      
      if (account) {
        // Create user session
        const authToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userData: User = {
          id: 1,
          email: account.email,
          firstName: account.role.charAt(0).toUpperCase() + account.role.slice(1),
          lastName: 'User',
          role: account.role as 'admin' | 'operator' | 'viewer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Save to localStorage first
        try {
          localStorage.setItem('authToken', authToken);
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('✅ Login successful - Session saved to localStorage');
        } catch (storageError) {
          console.warn('⚠️ Could not save to localStorage:', storageError);
        }
        
        // Set state after localStorage is saved
        setToken(authToken);
        setUser(userData);
        
        console.log('✅ Login successful - State updated');
        return true;
      } else {
        console.log('❌ Invalid credentials');
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error);
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
