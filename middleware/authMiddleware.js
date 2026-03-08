const TokenService = require('../services/tokenService');
const User = require('../models/User');
const Student = require('../models/Student'); // Add this import

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = TokenService.verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    // Check if the token belongs to a student
    if (decoded.role === 'student') {
      const student = await Student.findById(decoded.id);
      
      if (!student) {
        return res.status(401).json({ message: 'Student not found' });
      }
      
      if (student.status !== 'active') {
        return res.status(401).json({ message: 'Account is not active' });
      }
      
      // Attach student to req.user for consistency
      req.user = student;
      // Ensure the role is set correctly
      req.user.role = 'student';
    } else {
      // Handle regular users (admin, super_admin, etc.)
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      if (user.status !== 'active') {
        return res.status(401).json({ message: 'Account is not active' });
      }
      
      req.user = user;
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    next();
  };
};

const checkAdminSubscription = async (req, res, next) => {
  // Skip subscription check for non-admin users (including students)
  if (req.user.role !== 'admin') {
    return next();
  }
  
  const subscriptionService = require('../services/subscriptionService');
  const status = await subscriptionService.checkSubscriptionStatus(req.user.id);
  
  if (!status.active) {
    return res.status(403).json({ 
      message: 'Subscription expired or inactive',
      reason: status.reason 
    });
  }
  
  req.subscription = status;
  next();
};

module.exports = { authenticate, authorize, checkAdminSubscription };