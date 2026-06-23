// remindme-backend/services/termiiService.js
const axios = require('axios');

class TermiiService {
  constructor() {
    this.apiKey = process.env.TERMII_API_KEY;
    this.baseUrl = process.env.TERMII_BASE_URL;
    this.senderId = process.env.TERMII_SENDER_ID;
    this.defaultChannel = process.env.TERMII_DEFAULT_CHANNEL;
  }

  /**
   * Send SMS notification
   * @param {string} phoneNumber - Recipient phone number (international format)
   * @param {string} message - Message content
   * @param {string} channel - 'dnd' or 'generic'
   * @param {string} senderId - Custom sender ID (optional)
   * @returns {Promise<Object>} - Response from Termii
   */
  async sendSms(phoneNumber, message, channel = null, senderId = null) {
    try {
      // Validate required environment variables
      if (!this.apiKey) {
        throw new Error('TERMII_API_KEY is not configured in environment variables');
      }
      if (!this.baseUrl) {
        throw new Error('TERMII_BASE_URL is not configured in environment variables');
      }
      if (!this.senderId) {
        throw new Error('TERMII_SENDER_ID is not configured in environment variables');
      }

      // Format phone number (remove + and special characters)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Build payload exactly as Termii expects
      const payload = {
        api_key: this.apiKey,
        to: formattedPhone,
        from: senderId || this.senderId,
        sms: message,
        type: 'plain',
        channel: channel || this.defaultChannel || 'generic'
      };

      console.log('📱 Sending SMS via Termii:', {
        to: formattedPhone,
        from: senderId || this.senderId,
        channel: channel || this.defaultChannel || 'generic',
        messageLength: message.length
      });

      const response = await axios.post(
        `${this.baseUrl}/api/sms/send`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      // Check response structure
      if (response.data.code === 'ok') {
        console.log('✅ SMS sent successfully:', {
          messageId: response.data.message_id,
          balance: response.data.balance,
          user: response.data.user
        });
        
        return {
          success: true,
          messageId: response.data.message_id,
          messageIdStr: response.data.message_id_str,
          balance: response.data.balance,
          user: response.data.user,
          message: response.data.message,
          raw: response.data
        };
      } else {
        throw new Error(response.data.message || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('❌ Termii SMS Error:', {
        error: error.message,
        response: error.response?.data
      });
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        code: error.response?.data?.code,
        raw: error.response?.data
      };
    }
  }

  /**
   * Format phone number to international format (without +)
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} - Formatted phone number (e.g., 2348032034293)
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any non-numeric characters except +
    let cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    
    // If number starts with 0, replace with 234 (Nigeria)
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.substring(1);
    }
    
    // If number has +, remove it (Termii expects just the number)
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    // Remove any remaining + signs
    cleaned = cleaned.replace(/\+/g, '');
    
    return cleaned;
  }

  /**
   * Build reminder message - Plain text without emojis
   * @param {Object} reminder - Reminder object
   * @returns {string} - Formatted message
   */
  buildReminderMessage(reminder) {
    const date = new Date(reminder.datetime);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Build plain text message without emojis
    let message = `REMINDER: ${reminder.title}\n`;
    message += `Date: ${formattedDate}\n`;
    message += `Time: ${formattedTime}\n`;
    
    if (reminder.priority && reminder.priority !== 'low') {
      message += `Priority: ${reminder.priority.toUpperCase()}\n`;
    }
    
    message += `\nDon't forget! - RemindMe`;

    return message;
  }

  /**
   * Send reminder notification
   * @param {Object} reminder - Reminder object
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} senderId - Custom sender ID (optional)
   * @returns {Promise<Object>} - Response from Termii
   */
  async sendReminderNotification(reminder, phoneNumber, senderId = null) {
    const message = this.buildReminderMessage(reminder);
    const channel = 'generic';
    return await this.sendSms(phoneNumber, message, channel, senderId);
  }
}

module.exports = new TermiiService();