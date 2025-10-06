// Clear authentication storage utility
// Run this in browser console to clear stale auth data

console.log('🧹 Clearing authentication storage...');

// Clear localStorage
localStorage.removeItem('authToken');
localStorage.removeItem('user');

// Clear sessionStorage
sessionStorage.removeItem('authToken');
sessionStorage.removeItem('user');

// Clear any other auth-related items
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('auth') || key.includes('token') || key.includes('user'))) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

console.log('✅ Authentication storage cleared');
console.log('🔄 Please refresh the page and try logging in again');

// Force page reload
setTimeout(() => {
  window.location.reload();
}, 1000);
