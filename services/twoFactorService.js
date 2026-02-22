const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

class TwoFactorService {
  static generateSecret(email) {
    const secret = speakeasy.generateSecret({
      name: `CBT Simulator (${email})`,
      issuer: 'CBT Simulator'
    });
    
    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url
    };
  }

  static async generateQRCode(otpauthUrl) {
    try {
      const qrCode = await qrcode.toDataURL(otpauthUrl);
      return qrCode;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  static verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1
    });
  }
}

module.exports = TwoFactorService;