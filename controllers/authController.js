const bcrypt = require('bcryptjs');
const User = require('../models/User');
const TokenService = require('../services/tokenService');
const { auth } = require('../config/firebase');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const tokens = TokenService.generateTokens(user);
    TokenService.setTokenCookies(res, tokens);
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      tokens
    });
  } catch (error) {
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
    const { password: _, ...user } = req.user;
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
    
    const { password: _, ...userWithoutPassword } = user;
    
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
  logout,
  refreshToken,
  getMe,
  createSuperAdmin
};