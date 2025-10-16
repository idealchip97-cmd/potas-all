const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const token = authHeader.substring(7);
    
    // Handle development/demo tokens
    if (token.startsWith('demo_token_') || token.startsWith('dev-token')) {
      console.log('🔧 Development token detected, bypassing JWT verification');
      
      // Create a mock admin user for development
      req.user = {
        id: 1,
        email: 'admin@potasfactory.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true
      };
      
      return next();
    }
    
    // Handle real JWT tokens
    const decoded = verifyToken(token);
    
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
