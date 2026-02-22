const bcrypt = require('bcryptjs');
const User = require('../models/User');
const TokenService = require('../services/tokenService');
const TwoFactorService = require('../services/twoFactorService');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { db } = require('../config/firebase');
    
    if (!db) {
      return res.status(500).json({ 
        message: 'Database connection error',
        error: 'Firebase not initialized'
      });
    }
    
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
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
      status: 'active'
    });
    
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