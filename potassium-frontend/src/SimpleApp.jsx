import React, { useState, useEffect } from 'react';
import SimpleLogin from './SimpleLogin';

function SimpleApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsLoggedIn(true);
        console.log('✅ User already logged in:', parsedUser.email);
      } catch (error) {
        console.log('❌ Invalid user data, clearing storage');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    console.log('🚪 User logged out');
  };

  if (!isLoggedIn) {
    return <SimpleLogin />;
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '50px auto', 
      padding: '30px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '10px', 
        boxShadow: '0 0 20px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h1>🎉 Welcome to Potassium Radar System!</h1>
        <p><strong>✅ LOGIN SUCCESSFUL!</strong></p>
        <p>👤 <strong>User:</strong> {user?.firstName} {user?.lastName}</p>
        <p>📧 <strong>Email:</strong> {user?.email}</p>
        <p>🔑 <strong>Role:</strong> {user?.role}</p>
        
        <button 
          onClick={handleLogout}
          style={{ 
            padding: '10px 20px', 
            background: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '15px'
          }}
        >
          🚪 Logout
        </button>
      </div>
      
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '10px', 
        boxShadow: '0 0 20px rgba(0,0,0,0.1)'
      }}>
        <h2>📊 System Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ background: '#e7f3ff', padding: '15px', borderRadius: '5px' }}>
            <h3>🔧 Backend API</h3>
            <p>✅ Running on port 3000</p>
          </div>
          <div style={{ background: '#e7f3ff', padding: '15px', borderRadius: '5px' }}>
            <h3>📸 Image Server</h3>
            <p>✅ Running on port 3003</p>
          </div>
          <div style={{ background: '#e7f3ff', padding: '15px', borderRadius: '5px' }}>
            <h3>📡 UDP Listener</h3>
            <p>✅ Active on port 17081</p>
          </div>
          <div style={{ background: '#e7f3ff', padding: '15px', borderRadius: '5px' }}>
            <h3>⚛️ Frontend</h3>
            <p>✅ You're here!</p>
          </div>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <h3>🔗 Quick Links</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a href="http://localhost:3000/health" target="_blank" style={{ 
              padding: '8px 15px', 
              background: '#28a745', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '5px' 
            }}>
              Backend Health
            </a>
            <a href="http://localhost:3003/health" target="_blank" style={{ 
              padding: '8px 15px', 
              background: '#17a2b8', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '5px' 
            }}>
              Image Server
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleApp;
