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
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      // Optional: Add connection timeout
      connectionTimeout: 10000,
    });

    // Verify connection
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
   * Build reminder email HTML
   * @param {Object} reminder - Reminder object
   * @param {Object} user - User object (optional)
   * @returns {string} - HTML email content
   */
  buildReminderEmail(reminder, user = null) {
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

    const priorityColors = {
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#10B981'
    };

    const priorityLabels = {
      high: '🔴 High',
      medium: '🟡 Medium',
      low: '🟢 Low'
    };

    const priorityColor = priorityColors[reminder.priority] || '#6B7280';
    const priorityLabel = priorityLabels[reminder.priority] || reminder.priority;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reminder Notification</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #F8FAFC;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 560px;
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
            }
            .card-header {
              padding: 32px 32px 0 32px;
            }
            .card-body {
              padding: 24px 32px 32px 32px;
            }
            .card-footer {
              padding: 16px 32px;
              background: #F8FAFC;
              border-top: 1px solid #E2E8F0;
              text-align: center;
            }
            .logo {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 20px;
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
              font-size: 24px;
              font-weight: 700;
              color: #1E293B;
              margin: 0 0 8px 0;
            }
            .reminder-subtitle {
              color: #64748B;
              font-size: 14px;
              margin: 0 0 24px 0;
            }
            .detail-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 24px;
            }
            .detail-item {
              background: #F8FAFC;
              border-radius: 8px;
              padding: 12px 16px;
            }
            .detail-label {
              font-size: 11px;
              font-weight: 600;
              color: #94A3B8;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .detail-value {
              font-size: 14px;
              font-weight: 500;
              color: #1E293B;
            }
            .priority-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 600;
              color: white;
              background: ${priorityColor};
            }
            .notification-mode {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 500;
              background: #EFF6FF;
              color: #3B82F6;
            }
            .action-btn {
              display: inline-block;
              padding: 10px 24px;
              background: #1E293B;
              color: #FFFFFF;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 14px;
              transition: background 0.15s;
            }
            .action-btn:hover {
              background: #0F172A;
            }
            .footer-text {
              color: #94A3B8;
              font-size: 12px;
              margin: 0;
            }
            .footer-text a {
              color: #3B82F6;
              text-decoration: none;
            }
            @media (max-width: 480px) {
              .detail-grid {
                grid-template-columns: 1fr;
              }
              .card-header {
                padding: 24px 20px 0 20px;
              }
              .card-body {
                padding: 20px 20px 24px 20px;
              }
              .reminder-title {
                font-size: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="card-header">
                <div class="logo">
                  <div class="logo-icon">R</div>
                  <span class="logo-text">Remind<span>Me</span></span>
                </div>
                <h1 class="reminder-title">${reminder.title}</h1>
                <p class="reminder-subtitle">Your reminder is due soon</p>
              </div>
              <div class="card-body">
                <div class="detail-grid">
                  <div class="detail-item">
                    <div class="detail-label">📅 Date</div>
                    <div class="detail-value">${formattedDate}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">⏰ Time</div>
                    <div class="detail-value">${formattedTime}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">⚡ Priority</div>
                    <div class="detail-value">
                      <span class="priority-badge">${priorityLabel}</span>
                    </div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">🔔 Notification</div>
                    <div class="detail-value">
                      <span class="notification-mode">${reminder.notificationMode.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                ${reminder.phone ? `
                  <div style="margin-bottom: 16px; padding: 12px 16px; background: #F0FDF4; border-radius: 8px; border-left: 3px solid #10B981;">
                    <div style="font-size: 13px; color: #059669;">
                      📱 SMS notification will also be sent to ${reminder.phone}
                    </div>
                  </div>
                ` : ''}
                <div style="margin-top: 24px; text-align: center;">
                  <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="action-btn">
                    View in Dashboard
                  </a>
                </div>
              </div>
              <div class="card-footer">
                <p class="footer-text">
                  You're receiving this because you created a reminder on RemindMe.
                  <br>
                  <a href="${process.env.APP_URL || 'http://localhost:3000'}/settings">Manage notifications</a>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Build plain text reminder message
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

    let message = `REMINDER: ${reminder.title}\n\n`;
    message += `Date: ${formattedDate}\n`;
    message += `Time: ${formattedTime}\n`;
    message += `Priority: ${reminder.priority.toUpperCase()}\n`;
    message += `Notification: ${reminder.notificationMode.toUpperCase()}\n\n`;
    message += `Don't forget your reminder!\n`;
    message += `View it in your dashboard: ${process.env.APP_URL || 'http://localhost:3000'}`;

    return message;
  }

  /**
   * Send reminder email
   * @param {Object} reminder - Reminder object
   * @param {string} email - Recipient email
   * @param {Object} user - User object (optional)
   * @returns {Promise<Object>} - Result
   */
  async sendReminderEmail(reminder, email, user = null) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        throw new Error('Email service not configured. Check your environment variables.');
      }

      // Validate email
      if (!email || !email.includes('@')) {
        throw new Error('Invalid email address');
      }

      const htmlContent = this.buildReminderEmail(reminder, user);
      const plainText = this.buildPlainTextEmail(reminder);

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"RemindMe" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `🔔 Reminder: ${reminder.title}`,
        text: plainText,
        html: htmlContent,
        // Optional: Add reply-to
        replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
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
   * Send a test email (useful for testing configuration)
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
          <h1 style="color: #3B82F6;">✅ Email Test Successful</h1>
          <p>Your RemindMe email configuration is working correctly.</p>
          <p>You can now send reminder notifications via email.</p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
          <p style="color: #64748B; font-size: 14px;">
            This is an automated test message from RemindMe.
          </p>
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