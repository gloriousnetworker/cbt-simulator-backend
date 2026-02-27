const TokenService = require('../services/tokenService');
const Student = require('../models/Student');

const authenticateStudent = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = TokenService.verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    if (decoded.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Student only.' });
    }
    
    const student = await Student.findById(decoded.id);
    
    if (!student) {
      return res.status(401).json({ message: 'Student not found' });
    }
    
    if (student.status !== 'active') {
      return res.status(401).json({ message: 'Account is not active' });
    }
    
    req.student = student;
    req.user = student;
    next();
  } catch (error) {
    console.error('Student authentication error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = { authenticateStudent };