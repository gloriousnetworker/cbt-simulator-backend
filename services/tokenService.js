const jwt = require('jsonwebtoken');

class TokenService {
  static generateTokens(user) {
    const accessToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  static generateTempToken(user) {
    return jwt.sign(
      { id: user.id, temp: true },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
  }

  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return null;
    }
  }

  static verifyTempToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded.temp) return null;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  static setTokenCookies(res, tokens) {
    // For production (Vercel domain)
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax'
      maxAge: 15 * 60 * 1000,
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax'
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
    });
  }

  static clearTokenCookies(res) {
    res.clearCookie('accessToken', {
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
    });
    res.clearCookie('refreshToken', {
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
    });
  }
}

module.exports = TokenService;