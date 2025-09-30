import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import apiService from '../services/api';

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
    try {
      setIsLoading(true);
      
      // Mock authentication - no backend API call
      console.log('Auth: Mock login attempt for', email);
      
      // Check demo accounts
      const demoAccounts = [
        { email: 'admin@potasfactory.com', password: 'admin123', role: 'Admin' },
        { email: 'operator@potasfactory.com', password: 'operator123', role: 'Operator' },
        { email: 'viewer@potasfactory.com', password: 'viewer123', role: 'Viewer' },
      ];
      
      const account = demoAccounts.find(acc => acc.email === email && acc.password === password);
      
      if (account) {
        const mockToken = `mock_token_${Date.now()}`;
        const mockUser: User = {
          id: 1,
          email: account.email,
          firstName: account.role,
          lastName: 'User',
          role: account.role.toLowerCase() as 'admin' | 'operator' | 'viewer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setToken(mockToken);
        setUser(mockUser);
        
        localStorage.setItem('authToken', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
        
        console.log('Auth: Mock login successful for', account.role);
        return true;
      }
      
      console.log('Auth: Mock login failed - invalid credentials');
      return false;
    } catch (error) {
      console.error('Login error:', error);
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
