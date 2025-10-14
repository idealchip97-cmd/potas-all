// Auto-login utility for development
const autoLogin = async () => {
  try {
    console.log('🔐 Auto-login: Attempting to authenticate...');
    
    // Try to login with admin credentials
    const response = await fetch('http://localhost:3001/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@potasfactory.com',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store authentication data
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      console.log('✅ Auto-login successful!');
      console.log(`   User: ${data.data.user.firstName} ${data.data.user.lastName}`);
      console.log(`   Role: ${data.data.user.role}`);
      console.log(`   Token stored in localStorage`);
      
      // Reload the page to trigger authentication
      window.location.reload();
      
      return true;
    } else {
      console.error('❌ Auto-login failed:', data.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Auto-login error:', error);
    return false;
  }
};

// Export for use in other files
window.autoLogin = autoLogin;

export default autoLogin;
