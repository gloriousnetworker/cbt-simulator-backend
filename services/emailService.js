const nodemailer = require('nodemailer');

class EmailService {
  static transporter = null;
  static baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  static appName = 'Einstein CBT Platform';
  static supportEmail = 'support@einsteincbt.com';

  static initializeTransporter() {
    if (this.transporter) return this.transporter;

    // For Gmail in production/development
    if (process.env.EMAIL_SERVICE === 'gmail' || process.env.EMAIL_HOST?.includes('gmail')) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD // App password, not regular password
        }
      });
    } else {
      // Generic SMTP
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }
    
    return this.transporter;
  }

  static getBaseTemplate(content, title = 'Einstein CBT Platform') {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
          
          body {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: slideIn 0.5s ease-out;
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 50%);
            animation: rotate 20s linear infinite;
          }
          
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .logo {
            font-size: 48px;
            font-weight: 700;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            margin-bottom: 10px;
            position: relative;
          }
          
          .logo span {
            display: inline-block;
            animation: float 3s ease-in-out infinite;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          .einstein-quote {
            color: rgba(255,255,255,0.9);
            font-size: 14px;
            font-style: italic;
            margin-top: 10px;
            position: relative;
          }
          
          .content {
            padding: 40px 30px;
            background: white;
          }
          
          .button {
            display: inline-block;
            padding: 14px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
          }
          
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          }
          
          .info-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
          }
          
          .token-box {
            background: #2c3e50;
            color: #00ff9d;
            padding: 15px;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 18px;
            text-align: center;
            letter-spacing: 2px;
            margin: 20px 0;
          }
          
          .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
          }
          
          .social-links {
            margin: 20px 0;
          }
          
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            text-decoration: none;
          }
          
          .security-badge {
            background: #e8f5e9;
            color: #2e7d32;
            padding: 10px;
            border-radius: 50px;
            display: inline-block;
            font-size: 12px;
            font-weight: 600;
          }
          
          .highlight {
            color: #667eea;
            font-weight: 700;
          }
          
          .qr-code {
            text-align: center;
            margin: 30px 0;
          }
          
          .qr-code img {
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          
          .steps {
            counter-reset: step;
            list-style: none;
            padding: 0;
          }
          
          .steps li {
            counter-increment: step;
            margin: 20px 0;
            padding-left: 50px;
            position: relative;
          }
          
          .steps li::before {
            content: counter(step);
            position: absolute;
            left: 0;
            top: 0;
            width: 35px;
            height: 35px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <span>🧠</span> Einstein CBT
            </div>
            <div class="einstein-quote">
              "Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world."
            </div>
          </div>
          
          <div class="content">
            ${content}
          </div>
          
          <div class="footer">
            <div class="security-badge">
              🔒 256-bit SSL Encrypted
            </div>
            
            <div class="social-links">
              <a href="#">📘 Facebook</a>
              <a href="#">🐦 Twitter</a>
              <a href="#">📷 Instagram</a>
              <a href="#">💼 LinkedIn</a>
            </div>
            
            <p style="color: #6c757d; font-size: 12px; margin-top: 20px;">
              © ${new Date().getFullYear()} Einstein CBT Platform. All rights reserved.<br>
              This email was sent to verify your identity. If you didn't request this, please ignore or contact support.
            </p>
            
            <p style="color: #6c757d; font-size: 11px;">
              Einstein CBT Platform - Where Intelligence Meets Innovation<br>
              ${this.supportEmail} | ${this.baseUrl}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static async sendVerificationEmail(email, token, name) {
    try {
      const verificationLink = `${this.baseUrl}/verify-email?token=${token}`;
      
      const content = `
        <h1 style="color: #2c3e50; margin-bottom: 20px;">Welcome to the Future of Learning, ${name}! 🚀</h1>
        
        <p style="font-size: 16px; color: #34495e;">As Einstein once said, "The important thing is not to stop questioning." You're about to embark on an incredible journey of knowledge and discovery.</p>
        
        <div class="info-box">
          <p style="margin: 0;"><strong>✨ Your Quantum Leap Awaits</strong></p>
          <p style="margin: 10px 0 0; color: #666;">Click the button below to verify your email and activate your account. This is your first step towards mastering the universe of knowledge!</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${verificationLink}" class="button">🔐 Verify Your Email Address</a>
        </div>
        
        <p style="text-align: center; color: #7f8c8d; font-size: 14px;">Button not working? Copy this link:</p>
        <div class="token-box">${verificationLink}</div>
        
        <div style="margin-top: 30px; padding: 20px; background: #f0f4f8; border-radius: 10px;">
          <p style="margin: 0;"><strong>⚡ What happens next?</strong></p>
          <ul class="steps">
            <li>Your account will be activated instantly</li>
            <li>You'll get access to Einstein's curated question banks</li>
            <li>Start practicing with our AI-powered learning system</li>
            <li>Track your progress with quantum-accurate analytics</li>
          </ul>
        </div>
        
        <p style="color: #7f8c8d; font-style: italic; margin-top: 20px;">
          "The only source of knowledge is experience." - Let's begin your experience!
        </p>
      `;
      
      const mailOptions = {
        from: `"🧠 Einstein CBT" <${process.env.GMAIL_USER || 'noreply@einsteincbt.com'}>`,
        to: email,
        subject: '🚀 Welcome to Einstein CBT - Verify Your Email',
        html: this.getBaseTemplate(content, 'Verify Your Email - Einstein CBT')
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n=== 📧 EMAIL VERIFICATION (DEV MODE) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Verification Link: ${verificationLink}`);
        console.log(`Token: ${token}`);
        console.log('========================================\n');
        return { messageId: 'dev-mode-' + Date.now() };
      }
      
      const transporter = this.initializeTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ Continuing in development mode');
        return { messageId: 'dev-mode-failed' };
      }
      throw error;
    }
  }

  static async sendWelcomeEmail(email, name, password) {
    try {
      const loginLink = `${this.baseUrl}/login`;
      
      const content = `
        <h1 style="color: #2c3e50; margin-bottom: 20px;">Welcome Aboard, Professor ${name}! 🎓</h1>
        
        <p style="font-size: 16px; color: #34495e;">"Education is not the learning of facts, but the training of the mind to think." - You're now part of the most intelligent learning community!</p>
        
        <div class="info-box">
          <p style="margin: 0;"><strong>🔑 Your Quantum Credentials</strong></p>
          <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <span style="background: #2c3e50; color: #00ff9d; padding: 5px 10px; border-radius: 5px;">${password}</span></p>
          <p style="margin: 10px 0 0; color: #e74c3c;"><strong>⚠️ Important:</strong> Please change your password after first login</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${loginLink}" class="button">🚀 Launch Your Dashboard</a>
        </div>
        
        <div style="margin-top: 30px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; text-align: center;">
            <div style="font-size: 24px;">📚</div>
            <div style="font-weight: 600;">Smart Practice</div>
          </div>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; text-align: center;">
            <div style="font-size: 24px;">📊</div>
            <div style="font-weight: 600;">Quantum Analytics</div>
          </div>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; text-align: center;">
            <div style="font-size: 24px;">🎯</div>
            <div style="font-weight: 600;">Exam Mode</div>
          </div>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; text-align: center;">
            <div style="font-size: 24px;">🏆</div>
            <div style="font-weight: 600;">Leaderboards</div>
          </div>
        </div>
        
        <p style="color: #7f8c8d; font-style: italic; margin-top: 20px;">
          "Strive not to be a success, but rather to be of value." Start adding value today!
        </p>
      `;
      
      const mailOptions = {
        from: `"🧠 Einstein CBT" <${process.env.GMAIL_USER || 'noreply@einsteincbt.com'}>`,
        to: email,
        subject: '🎉 Welcome to Einstein CBT - Your Learning Journey Begins',
        html: this.getBaseTemplate(content, 'Welcome to Einstein CBT')
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n=== 📧 WELCOME EMAIL (DEV MODE) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Password: ${password}`);
        console.log('==================================\n');
        return { messageId: 'dev-mode-' + Date.now() };
      }
      
      const transporter = this.initializeTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      if (process.env.NODE_ENV !== 'production') return { messageId: 'dev-mode-failed' };
      throw error;
    }
  }

  static async sendSchoolApprovalEmail(email, schoolName) {
    try {
      const dashboardLink = `${this.baseUrl}/admin/dashboard`;
      
      const content = `
        <h1 style="color: #2c3e50; margin-bottom: 20px;">🎉 Congratulations ${schoolName} is Now Approved!</h1>
        
        <p style="font-size: 16px; color: #34495e;">"In the middle of difficulty lies opportunity." Your institution is now part of the Einstein CBT ecosystem!</p>
        
        <div class="info-box" style="background: #e8f5e9; border-left-color: #2e7d32;">
          <p style="margin: 0; font-size: 18px;"><strong>✅ School Status: ACTIVE</strong></p>
          <p style="margin: 10px 0 0;">Your school has been verified and approved. You can now:</p>
        </div>
        
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 15px 0; padding-left: 30px; position: relative;">
            <span style="position: absolute; left: 0; color: #27ae60;">✓</span>
            Create and manage student accounts
          </li>
          <li style="margin: 15px 0; padding-left: 30px; position: relative;">
            <span style="position: absolute; left: 0; color: #27ae60;">✓</span>
            Upload questions for different subjects
          </li>
          <li style="margin: 15px 0; padding-left: 30px; position: relative;">
            <span style="position: absolute; left: 0; color: #27ae60;">✓</span>
            Schedule exams and monitor progress
          </li>
          <li style="margin: 15px 0; padding-left: 30px; position: relative;">
            <span style="position: absolute; left: 0; color: #27ae60;">✓</span>
            Generate detailed performance reports
          </li>
        </ul>
        
        <div style="text-align: center;">
          <a href="${dashboardLink}" class="button">🏫 Access School Dashboard</a>
        </div>
        
        <p style="color: #7f8c8d; font-style: italic; margin-top: 20px;">
          "Education is the most powerful weapon which you can use to change the world." Start changing lives today!
        </p>
      `;
      
      const mailOptions = {
        from: `"🧠 Einstein CBT" <${process.env.GMAIL_USER || 'noreply@einsteincbt.com'}>`,
        to: email,
        subject: '✅ School Registration Approved - Einstein CBT',
        html: this.getBaseTemplate(content, 'School Approved - Einstein CBT')
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n=== 📧 SCHOOL APPROVAL EMAIL (DEV MODE) ===');
        console.log(`To: ${email}`);
        console.log(`School: ${schoolName}`);
        console.log('==========================================\n');
        return { messageId: 'dev-mode-' + Date.now() };
      }
      
      const transporter = this.initializeTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ School approval email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending school approval email:', error);
      if (process.env.NODE_ENV !== 'production') return { messageId: 'dev-mode-failed' };
      throw error;
    }
  }

  static async send2FASetupEmail(email, name, qrCodeUrl, secret) {
    try {
      const content = `
        <h1 style="color: #2c3e50; margin-bottom: 20px;">🔐 Double the Security, Double the Intelligence!</h1>
        
        <p style="font-size: 16px; color: #34495e;">"Security is mostly a superstition. Life is either a daring adventure or nothing." Let's make your account adventure secure, ${name}!</p>
        
        <div class="info-box">
          <p style="margin: 0;"><strong>📱 Two-Factor Authentication (2FA) Setup</strong></p>
          <p style="margin: 10px 0 0;">Scan the QR code below with Google Authenticator or Authy:</p>
        </div>
        
        <div class="qr-code">
          <img src="${qrCodeUrl}" alt="2FA QR Code" style="max-width: 200px;">
        </div>
        
        <div style="text-align: center;">
          <p><strong>Or enter this code manually:</strong></p>
          <div class="token-box">${secret}</div>
        </div>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 10px; margin-top: 20px;">
          <p style="margin: 0;"><strong>⚠️ Important Security Tips:</strong></p>
          <ul style="margin: 10px 0 0; padding-left: 20px;">
            <li>Save this secret in a password manager</li>
            <li>Keep backup codes in a safe place</li>
            <li>Never share your 2FA codes with anyone</li>
            <li>Our team will never ask for your 2FA codes</li>
          </ul>
        </div>
        
        <p style="color: #7f8c8d; font-style: italic; margin-top: 20px;">
          "The measure of intelligence is the ability to change." You've just made your account 100x more secure!
        </p>
      `;
      
      const mailOptions = {
        from: `"🧠 Einstein CBT" <${process.env.GMAIL_USER || 'noreply@einsteincbt.com'}>`,
        to: email,
        subject: '🔐 2FA Setup Complete - Extra Security Layer',
        html: this.getBaseTemplate(content, '2FA Setup - Einstein CBT')
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n=== 📧 2FA SETUP EMAIL (DEV MODE) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Secret: ${secret}`);
        console.log(`QR URL: ${qrCodeUrl}`);
        console.log('====================================\n');
        return { messageId: 'dev-mode-' + Date.now() };
      }
      
      const transporter = this.initializeTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ 2FA setup email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending 2FA setup email:', error);
      if (process.env.NODE_ENV !== 'production') return { messageId: 'dev-mode-failed' };
      throw error;
    }
  }

  static async sendPasswordResetEmail(email, token, name) {
    try {
      const resetLink = `${this.baseUrl}/reset-password?token=${token}`;
      
      const content = `
        <h1 style="color: #2c3e50; margin-bottom: 20px;">🔄 Reset Your Password, ${name}</h1>
        
        <p style="font-size: 16px; color: #34495e;">"Intellectual growth should commence at birth and cease only at death." Let's get you back on track!</p>
        
        <div class="info-box" style="background: #fff3e0;">
          <p style="margin: 0;"><strong>🔄 Password Reset Request</strong></p>
          <p style="margin: 10px 0 0;">We received a request to reset your password. Click the button below to create a new password:</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${resetLink}" class="button">🔑 Reset Password</a>
        </div>
        
        <p style="text-align: center; color: #7f8c8d; font-size: 14px;">Or use this link:</p>
        <div class="token-box">${resetLink}</div>
        
        <p style="color: #e74c3c; font-size: 14px; margin-top: 20px;">
          ⚠️ This link will expire in 1 hour. If you didn't request this, please ignore this email and ensure your account is secure.
        </p>
        
        <p style="color: #7f8c8d; font-style: italic; margin-top: 20px;">
          "Learn from yesterday, live for today, hope for tomorrow." - Keep learning!
        </p>
      `;
      
      const mailOptions = {
        from: `"🧠 Einstein CBT" <${process.env.GMAIL_USER || 'noreply@einsteincbt.com'}>`,
        to: email,
        subject: '🔄 Password Reset Request - Einstein CBT',
        html: this.getBaseTemplate(content, 'Password Reset - Einstein CBT')
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n=== 📧 PASSWORD RESET EMAIL (DEV MODE) ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log('========================================\n');
        return { messageId: 'dev-mode-' + Date.now() };
      }
      
      const transporter = this.initializeTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      if (process.env.NODE_ENV !== 'production') return { messageId: 'dev-mode-failed' };
      throw error;
    }
  }
}

module.exports = EmailService;