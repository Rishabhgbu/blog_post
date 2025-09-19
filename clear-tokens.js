// Script to clear all localStorage tokens
console.log('Clearing all authentication tokens...');
localStorage.removeItem('token');
localStorage.removeItem('userId');
localStorage.removeItem('username');
console.log('All tokens cleared. Please refresh the page and login again.');
