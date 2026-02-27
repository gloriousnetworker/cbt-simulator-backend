const TokenService = require('../services/tokenService');
const User = require('../models/User');

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
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Account is not active' });
    }
    
    req.user = user;
    next();
  } catch (error) {
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