// remindme-backend/services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Validate required environment variables
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email configuration missing. Email notifications will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 10000,
    });

    this.verifyConnection();
  }

  async verifyConnection() {
    if (!this.transporter) return;
    
    try {
      await this.transporter.verify();
      console.log('✅ Email service connected successfully');
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
    }
  }

  /**
   * Build reminder email HTML - Just the message, date, and time
   * @param {Object} reminder - Reminder object
   * @returns {string} - HTML email content
   */
  buildReminderEmail(reminder) {
    const date = new Date(reminder.datetime);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reminder</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #F8FAFC;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 480px;
              margin: 0 auto;
              padding: 40px 20px;
              background-color: #F8FAFC;
            }
            .card {
              background: #FFFFFF;
              border-radius: 16px;
              box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
              overflow: hidden;
              border-top: 4px solid #3B82F6;
              padding: 40px 32px;
            }
            .logo {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 28px;
            }
            .logo-icon {
              width: 36px;
              height: 36px;
              background: #3B82F6;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 700;
              font-size: 18px;
            }
            .logo-text {
              font-size: 20px;
              font-weight: 700;
              color: #1E293B;
            }
            .logo-text span {
              color: #3B82F6;
            }
            .reminder-title {
              font-size: 22px;
              font-weight: 700;
              color: #1E293B;
              margin: 0 0 24px 0;
              line-height: 1.3;
            }
            .divider {
              border: none;
              border-top: 1px solid #E2E8F0;
              margin: 24px 0;
            }
            .detail-row {
              display: flex;
              align-items: flex-start;
              margin-bottom: 16px;
            }
            .detail-row:last-child {
              margin-bottom: 0;
            }
            .detail-icon {
              width: 24px;
              font-size: 18px;
              flex-shrink: 0;
              margin-top: 1px;
            }
            .detail-content {
              flex: 1;
            }
            .detail-label {
              font-size: 12px;
              font-weight: 600;
              color: #94A3B8;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 2px;
            }
            .detail-value {
              font-size: 16px;
              font-weight: 500;
              color: #1E293B;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">
                <div class="logo-icon">R</div>
                <span class="logo-text">Remind<span>Me</span></span>
              </div>
              
              <div class="reminder-title">${reminder.title}</div>
              
              <hr class="divider">
              
              <div class="detail-row">
                <div class="detail-icon">📅</div>
                <div class="detail-content">
                  <div class="detail-label">Date</div>
                  <div class="detail-value">${formattedDate}</div>
                </div>
              </div>
              
              <div class="detail-row">
                <div class="detail-icon">⏰</div>
                <div class="detail-content">
                  <div class="detail-label">Time</div>
                  <div class="detail-value">${formattedTime}</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Build plain text reminder message - Clean and simple
   * @param {Object} reminder - Reminder object
   * @returns {string} - Plain text message
   */
  buildPlainTextEmail(reminder) {
    const date = new Date(reminder.datetime);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return `${reminder.title}\n\nDate: ${formattedDate}\nTime: ${formattedTime}`;
  }

  /**
   * Send reminder email
   * @param {Object} reminder - Reminder object
   * @param {string} email - Recipient email
   * @returns {Promise<Object>} - Result
   */
  async sendReminderEmail(reminder, email) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured. Check your environment variables.');
      }

      if (!email || !email.includes('@')) {
        throw new Error('Invalid email address');
      }

      const htmlContent = this.buildReminderEmail(reminder);
      const plainText = this.buildPlainTextEmail(reminder);

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"RemindMe" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Reminder: ${reminder.title}`,
        text: plainText,
        html: htmlContent,
      };

      console.log('📧 Sending reminder email to:', email);

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully:', {
        messageId: info.messageId,
        to: email,
        subject: mailOptions.subject
      });

      return {
        success: true,
        messageId: info.messageId,
        email: email,
        accepted: info.accepted,
        rejected: info.rejected,
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      return {
        success: false,
        error: error.message,
        email: email,
      };
    }
  }

  /**
   * Send a test email
   * @param {string} email - Recipient email
   * @returns {Promise<Object>} - Result
   */
  async sendTestEmail(email) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"RemindMe" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '✅ RemindMe Email Test',
        text: 'This is a test email from RemindMe. Your email configuration is working!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Email Test</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  background-color: #F8FAFC;
                  margin: 0;
                  padding: 0;
                }
                .container {
                  max-width: 480px;
                  margin: 0 auto;
                  padding: 40px 20px;
                }
                .card {
                  background: #FFFFFF;
                  border-radius: 16px;
                  padding: 40px 32px;
                  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
                  border-top: 4px solid #22C55E;
                }
                h1 {
                  color: #22C55E;
                  font-size: 24px;
                  margin: 0 0 12px 0;
                }
                p {
                  color: #1E293B;
                  font-size: 15px;
                  line-height: 1.6;
                  margin: 0 0 16px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="card">
                  <h1>✅ Email Test Successful</h1>
                  <p>Your RemindMe email configuration is working correctly.</p>
                  <p>You can now send reminder notifications via email.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Test email sent:', info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        email: email,
      };
    } catch (error) {
      console.error('❌ Test email failed:', error.message);
      return {
        success: false,
        error: error.message,
        email: email,
      };
    }
  }

  /**
   * Get email service status
   * @returns {Object} - Status
   */
  getStatus() {
    return {
      configured: !!this.transporter,
      host: process.env.EMAIL_HOST || 'not set',
      user: process.env.EMAIL_USER || 'not set',
      from: process.env.EMAIL_FROM || 'not set',
    };
  }
}

module.exports = new EmailService();