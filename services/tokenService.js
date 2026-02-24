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
    const isProduction = process.env.NODE_ENV === 'production';
    
    // For localhost development
    if (!isProduction) {
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/'
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
    } else {
      // For production (Vercel) - IMPORTANT: Don't set domain for Vercel serverless
      // Vercel handles domains differently, and setting domain can cause issues
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 15 * 60 * 1000,
        path: '/'
        // REMOVED: domain: '.vercel.app'
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
        // REMOVED: domain: '.vercel.app'
      });
    }

    // Return tokens for Postman/clients that don't handle cookies
    return tokens;
  }

  static clearTokenCookies(res) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.clearCookie('accessToken', {
      path: '/',
      domain: isProduction ? undefined : undefined // Remove domain for production
    });
    res.clearCookie('refreshToken', {
      path: '/',
      domain: isProduction ? undefined : undefined // Remove domain for production
    });
  }
}

module.exports = TokenService;