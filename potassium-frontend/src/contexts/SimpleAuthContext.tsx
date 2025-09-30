import * as React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Simple User type
interface SimpleUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'operator' | 'viewer';
}

// Simple Auth Context type
interface SimpleAuthContextType {
  user: SimpleUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SimpleAuthProvider');
  }
  return context;
};

interface SimpleAuthProviderProps {
  children: ReactNode;
}

export const SimpleAuthProvider: React.FC<SimpleAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data on app load
    console.log('🔐 Checking for stored authentication');
    
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        console.log('✅ Restored session for', userData.email);
      } else {
        console.log('ℹ️ No stored authentication found');
      }
    } catch (error) {
      console.error('❌ Error parsing stored user data', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('🔐 Login attempt for:', email);
    
    setIsLoading(true);
    
    try {
      // Simple demo accounts
      const accounts = [
        { email: 'admin@potasfactory.com', password: 'admin123', role: 'admin' as const },
        { email: 'operator@potasfactory.com', password: 'operator123', role: 'operator' as const },
        { email: 'viewer@potasfactory.com', password: 'viewer123', role: 'viewer' as const },
      ];
      
      const account = accounts.find(acc => 
        acc.email.toLowerCase() === email.toLowerCase() && 
        acc.password === password
      );
      
      if (account) {
        const authToken = `token_${Date.now()}`;
        const userData: SimpleUser = {
          id: 1,
          email: account.email,
          firstName: account.role.charAt(0).toUpperCase() + account.role.slice(1),
          lastName: 'User',
          role: account.role,
        };
        
        setToken(authToken);
        setUser(userData);
        
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        console.log('✅ Login successful for', account.role);
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
    console.log('🚪 Logging out');
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  const value: SimpleAuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isLoading,
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
};
