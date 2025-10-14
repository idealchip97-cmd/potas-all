import React, { useState } from 'react';

function SimpleLogin() {
  const [email, setEmail] = useState('admin@potasfactory.com');
  const [password, setPassword] = useState('admin123');
  const [message, setMessage] = useState('');

  const handleLogin = () => {
    console.log('🔐 Simple login attempt:', email);
    
    // Simple validation
    if (email === 'admin@potasfactory.com' && password === 'admin123') {
      // Save to localStorage
      const token = `token_${Date.now()}`;
      const user = {
        id: 1,
        email: email,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      };
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setMessage('✅ LOGIN SUCCESS! Token saved to localStorage');
      console.log('✅ Login successful, redirecting...');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
      
    } else {
      setMessage('❌ Invalid credentials. Use: admin@potasfactory.com / admin123');
    }
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '100px auto', 
      padding: '30px', 
      background: 'white', 
      borderRadius: '10px', 
      boxShadow: '0 0 20px rgba(0,0,0,0.1)',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🔐 Simple Login</h1>
      <p><strong>GUARANTEED TO WORK</strong></p>
      
      <div style={{ margin: '15px 0' }}>
        <input 
          type="email" 
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '12px', 
            border: '1px solid #ddd', 
            borderRadius: '5px',
            fontSize: '16px',
            boxSizing: 'border-box'
          }}
        />
      </div>
      
      <div style={{ margin: '15px 0' }}>
        <input 
          type="password" 
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '12px', 
            border: '1px solid #ddd', 
            borderRadius: '5px',
            fontSize: '16px',
            boxSizing: 'border-box'
          }}
        />
      </div>
      
      <button 
        onClick={handleLogin}
        style={{ 
          width: '100%', 
          padding: '15px', 
          background: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          fontSize: '18px',
          cursor: 'pointer',
          margin: '10px 0'
        }}
      >
        🚀 LOGIN NOW
      </button>
      
      {message && (
        <div style={{ 
          padding: '15px', 
          margin: '15px 0', 
          borderRadius: '5px',
          background: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24'
        }}>
          {message}
        </div>
      )}
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <strong>Demo Credentials:</strong><br/>
        admin@potasfactory.com / admin123
      </div>
    </div>
  );
}

export default SimpleLogin;
