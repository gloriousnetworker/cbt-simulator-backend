const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const School = require('../models/School');
const TokenService = require('../services/tokenService');
const TwoFactorService = require('../services/twoFactorService');
const EmailService = require('../services/emailService');
const Subject = require('../models/Subject');

const registerAdmin = async (req, res) => {
  try {
    const { email, password, name, schoolName, schoolAddress, schoolPhone } = req.body;
    
    const existingUser = await User.findByEmail(email);
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const school = await School.create({
      name: schoolName,
      address: schoolAddress,
      phone: schoolPhone,
      email,
      status: 'pending'
    });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role: 'admin',
      schoolId: school.id,
      status: 'pending',
      verificationToken
    });
    
    await EmailService.sendVerificationEmail(email, verificationToken, name);
    
    const { password: _, twoFactorSecret, ...userWithoutPassword } = user;
    
    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: userWithoutPassword,
      school
    });
  } catch (error) {
    console.error('Register admin error:', error);
    res.status(500).json({ message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    
    const user = await User.findByVerificationToken(token);
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }
    
    await User.verifyEmail(user.id);
    
    if (user.schoolId) {
      await School.update(user.schoolId, { status: 'active' });
      await EmailService.sendSchoolApprovalEmail(user.email, user.schoolId);
    }
    
    res.json({ message: 'Email verified successfully. Your account is now active.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Account is not active. Please verify your email.' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    if (user.twoFactorEnabled && (user.role === 'super_admin' || user.role === 'admin')) {
      const tempToken = TokenService.generateTempToken(user);
      
      return res.json({
        message: '2FA required',
        requiresTwoFactor: true,
        tempToken,
        userId: user.id
      });
    }
    
    const tokens = TokenService.generateTokens(user);
    TokenService.setTokenCookies(res, tokens);
    
    const { password: _, twoFactorSecret, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

const verify2FA = async (req, res) => {
  try {
    const { userId, token, tempToken } = req.body;
    
    const decoded = TokenService.verifyTempToken(tempToken);
    
    if (!decoded || decoded.id !== userId) {
      return res.status(401).json({ message: 'Invalid or expired temporary token' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: '2FA not set up for this user' });
    }
    
    const isValid = TwoFactorService.verifyToken(user.twoFactorSecret, token);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid 2FA token' });
    }
    
    await User.verify2FA(userId);
    
    const tokens = TokenService.generateTokens(user);
    TokenService.setTokenCookies(res, tokens);
    
    const { password: _, twoFactorSecret, ...userWithoutPassword } = user;
    
    res.json({
      message: '2FA verification successful',
      user: userWithoutPassword,
      tokens
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ message: error.message });
  }
};

const setup2FA = async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return res.status(403).json({ message: '2FA is only available for super admins and admins' });
    }
    
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is already enabled' });
    }
    
    const { secret, otpauthUrl } = TwoFactorService.generateSecret(user.email);
    
    const qrCode = await TwoFactorService.generateQRCode(otpauthUrl);
    
    await User.enable2FA(user.id, secret);
    
    // Send 2FA setup email
    try {
      await EmailService.send2FASetupEmail(user.email, user.name, qrCode, secret);
    } catch (emailError) {
      console.error('Failed to send 2FA email:', emailError);
    }
    
    res.json({
      message: '2FA setup initiated',
      secret,
      qrCode,
      otpauthUrl
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ message: error.message });
  }
};

const verify2FASetup = async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user;
    
    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: '2FA not set up' });
    }
    
    const isValid = TwoFactorService.verifyToken(user.twoFactorSecret, token);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid 2FA token' });
    }
    
    await User.verify2FA(user.id);
    
    res.json({
      message: '2FA enabled successfully'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ message: error.message });
  }
};

const disable2FA = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }
    
    await User.disable2FA(user.id);
    
    res.json({
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    TokenService.clearTokenCookies(res);
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }
    
    const decoded = TokenService.verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    const tokens = TokenService.generateTokens(user);
    TokenService.setTokenCookies(res, tokens);
    
    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const { password: _, twoFactorSecret, ...user } = req.user;
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSuperAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = await User.findByEmail(email);
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role: 'super_admin',
      status: 'active',
      emailVerified: true
    });
    
    await Subject.initializeDefaultSubjects();
    
    const { password: _, twoFactorSecret, ...userWithoutPassword } = user;
    
    res.status(201).json({
      message: 'Super admin created successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerAdmin,
  verifyEmail,
  login,
  verify2FA,
  setup2FA,
  verify2FASetup,
  disable2FA,
  logout,
  refreshToken,
  getMe,
  createSuperAdmin
};