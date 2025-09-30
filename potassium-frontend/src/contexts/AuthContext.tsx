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
        setToken(storedToken);
        setUser(userData);
        console.log('Auth: Restored session for', userData.email);
        console.log('Auth: User data:', userData);
      } catch (error) {
        console.error('Auth: Error parsing stored user data', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    } else {
      console.log('Auth: No stored authentication found');
    }
    
    console.log('Auth: Setting isLoading to false');
    setIsLoading(false);
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
        
        // Set state immediately
        setToken(authToken);
        setUser(userData);
        
        // Save to localStorage
        try {
          localStorage.setItem('authToken', authToken);
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('✅ Login successful - Session saved');
        } catch (storageError) {
          console.warn('⚠️ Could not save to localStorage:', storageError);
        }
        
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

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
