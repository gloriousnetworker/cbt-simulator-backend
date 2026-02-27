const nodemailer = require('nodemailer');

class EmailService {
  static transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  static async sendVerificationEmail(email, token, name) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <h1>Welcome to CBT Platform</h1>
        <p>Hello ${name},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationLink}" style="padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>Or copy this link: ${verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
      `
    };
    
    await this.transporter.sendMail(mailOptions);
  }

  static async sendWelcomeEmail(email, name, password) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to CBT Platform',
      html: `
        <h1>Welcome to CBT Platform</h1>
        <p>Hello ${name},</p>
        <p>Your account has been created successfully.</p>
        <p>Your login credentials:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p>Please change your password after logging in.</p>
        <a href="${process.env.FRONTEND_URL}/login" style="padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Login Now</a>
      `
    };
    
    await this.transporter.sendMail(mailOptions);
  }

  static async sendSchoolApprovalEmail(email, schoolName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'School Registration Approved',
      html: `
        <h1>School Registration Approved</h1>
        <p>Congratulations! Your school "${schoolName}" has been approved.</p>
        <p>You can now log in to your admin dashboard and start managing your students.</p>
        <a href="${process.env.FRONTEND_URL}/login" style="padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Login Now</a>
      `
    };
    
    await this.transporter.sendMail(mailOptions);
  }
}

module.exports = EmailService;