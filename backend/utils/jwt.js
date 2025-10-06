const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// Generate a fallback JWT secret if not provided in environment
const getJwtSecret = () => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '') {
    return process.env.JWT_SECRET;
  }
  
  // Generate a random secret as fallback (not recommended for production)
  console.warn('⚠️  JWT_SECRET not found in environment variables. Using generated secret.');
  console.warn('⚠️  For production, please set JWT_SECRET in your .env file.');
  return crypto.randomBytes(64).toString('hex');
};

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken
};
