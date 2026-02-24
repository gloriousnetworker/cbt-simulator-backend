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
      // For production (Vercel) - cross-site cookies
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none', // CRITICAL for cross-site requests
        maxAge: 15 * 60 * 1000,
        path: '/',
        domain: '.vercel.app' // Allow all vercel.app subdomains
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none', // CRITICAL for cross-site requests
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        domain: '.vercel.app' // Allow all vercel.app subdomains
      });
    }

    // Return tokens for Postman/clients that don't handle cookies
    return tokens;
  }

  static clearTokenCookies(res) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.clearCookie('accessToken', {
      path: '/',
      domain: isProduction ? '.vercel.app' : undefined
    });
    res.clearCookie('refreshToken', {
      path: '/',
      domain: isProduction ? '.vercel.app' : undefined
    });
  }
}

module.exports = TokenService;