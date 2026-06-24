// remindme-backend/controllers/reminderController.js
const Reminder = require('../models/Reminder');
const termiiService = require('../services/termiiService');
const emailService = require('../services/emailService');
const schedulerService = require('../services/schedulerService');

// @desc    Create reminder
// @route   POST /api/reminders
// @access  Private
const createReminder = async (req, res) => {
  try {
    const {
      title,
      datetime,
      priority,
      notificationMode,
      email,
      phone,
    } = req.body;

    // Validation for notification contact info
    if ((notificationMode === 'email' || notificationMode === 'both') && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for email notifications',
      });
    }

    if ((notificationMode === 'sms' || notificationMode === 'both') && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for SMS notifications',
      });
    }

    const reminder = await Reminder.create({
      userId: req.userId,
      title,
      datetime,
      priority: priority || 'medium',
      notificationMode: notificationMode || 'browser',
      email: email || null,
      phone: phone || null,
    });

    // Schedule SMS notification for the reminder time
    let smsScheduled = false;
    let emailScheduled = false;

    if (notificationMode === 'sms' || notificationMode === 'both') {
      // Schedule the SMS to be sent at the reminder time
      if (new Date(datetime) > new Date()) {
        schedulerService.scheduleReminder(reminder);
        smsScheduled = true;
        console.log(`📅 SMS scheduled for reminder ${reminder._id} at ${datetime}`);
      } else {
        // If the time is in the past, send immediately
        console.log(`⚠️ Reminder time is in the past, sending SMS immediately`);
        termiiService.sendReminderNotification(reminder, phone)
          .then(result => {
            if (result.success) {
              console.log(`✅ SMS sent immediately for reminder ${reminder._id}`);
              Reminder.findByIdAndUpdate(reminder._id, { notified: true })
                .catch(err => console.error('Error updating notification status:', err));
            } else {
              console.error(`❌ Failed to send SMS immediately for reminder ${reminder._id}:`, result.error);
            }
          })
          .catch(error => {
            console.error('Error sending SMS:', error);
          });
      }
    }

    // ⭐ NEW: Send email if email notification is enabled
    if (notificationMode === 'email' || notificationMode === 'both') {
      if (email) {
        // Send email immediately (or you could schedule it)
        emailService.sendReminderEmail(reminder, email)
          .then(result => {
            if (result.success) {
              console.log(`✅ Email sent for reminder ${reminder._id}`);
              // Update reminder to indicate email was sent
              Reminder.findByIdAndUpdate(reminder._id, { emailSent: true })
                .catch(err => console.error('Error updating email status:', err));
            } else {
              console.error(`❌ Failed to send email for reminder ${reminder._id}:`, result.error);
            }
          })
          .catch(error => {
            console.error('Error sending email:', error);
          });
        emailScheduled = true;
      }
    }

    res.status(201).json({
      success: true,
      data: reminder,
      message: smsScheduled || emailScheduled 
        ? `Reminder created. ${smsScheduled ? 'SMS ' : ''}${emailScheduled ? 'Email ' : ''}notification${smsScheduled && emailScheduled ? 's' : ''} will be sent.` 
        : 'Reminder created successfully.',
      smsScheduled,
      emailScheduled
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all reminders for user
// @route   GET /api/reminders
// @access  Private
const getReminders = async (req, res) => {
  try {
    const { filter } = req.query;
    const query = { userId: req.userId };

    // Apply filters
    if (filter === 'active') {
      query.completed = false;
      query.datetime = { $gte: new Date() };
    } else if (filter === 'completed') {
      query.completed = true;
    } else if (filter === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query.datetime = { $gte: startOfDay, $lte: endOfDay };
    } else if (filter === 'upcoming') {
      query.completed = false;
      query.datetime = { $gte: new Date() };
    }

    const reminders = await Reminder.find(query).sort({ datetime: 1 });

    res.status(200).json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get single reminder
// @route   GET /api/reminders/:id
// @access  Private
const getReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update reminder
// @route   PUT /api/reminders/:id
// @access  Private
const updateReminder = async (req, res) => {
  try {
    const { title, datetime, priority, notificationMode, email, phone, completed } = req.body;

    let reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    // Update fields
    if (title !== undefined) reminder.title = title;
    if (datetime !== undefined) reminder.datetime = datetime;
    if (priority !== undefined) reminder.priority = priority;
    if (notificationMode !== undefined) reminder.notificationMode = notificationMode;
    if (email !== undefined) reminder.email = email;
    if (phone !== undefined) reminder.phone = phone;
    if (completed !== undefined) reminder.completed = completed;

    await reminder.save();

    // Reschedule SMS if needed
    const hasSms = (reminder.notificationMode === 'sms' || reminder.notificationMode === 'both');
    const hasEmail = (reminder.notificationMode === 'email' || reminder.notificationMode === 'both');
    const hasPhone = reminder.phone !== null;
    const hasEmailAddress = reminder.email !== null;
    const isFuture = new Date(reminder.datetime) > new Date();
    const notCompleted = !reminder.completed;

    if (hasSms && hasPhone && isFuture && notCompleted) {
      // Cancel old job and schedule new one
      schedulerService.rescheduleReminder(reminder);
      console.log(`🔄 Rescheduled SMS for updated reminder ${reminder._id}`);
    } else if (!hasSms || !hasPhone || !isFuture || reminder.completed) {
      // Cancel the job if SMS no longer applies
      schedulerService.cancelJob(reminder._id);
      console.log(`🗑️ Cancelled SMS job for reminder ${reminder._id}`);
    }

    // ⭐ NEW: Send email if updated to include email
    if (hasEmail && hasEmailAddress && notCompleted) {
      emailService.sendReminderEmail(reminder, reminder.email)
        .then(result => {
          if (result.success) {
            console.log(`✅ Email sent for updated reminder ${reminder._id}`);
            Reminder.findByIdAndUpdate(reminder._id, { emailSent: true })
              .catch(err => console.error('Error updating email status:', err));
          } else {
            console.error(`❌ Failed to send email for updated reminder ${reminder._id}:`, result.error);
          }
        })
        .catch(error => {
          console.error('Error sending email:', error);
        });
    }

    res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
// @access  Private
const deleteReminder = async (req, res) => {
  try {
    // Cancel scheduled job before deleting
    schedulerService.cancelJob(req.params.id);
    
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Toggle reminder completion
// @route   PATCH /api/reminders/:id/toggle
// @access  Private
const toggleComplete = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    reminder.completed = !reminder.completed;
    await reminder.save();

    // If completed, cancel scheduled SMS
    if (reminder.completed) {
      schedulerService.cancelJob(reminder._id);
      console.log(`🗑️ Cancelled SMS job for completed reminder ${reminder._id}`);
    } else {
      // If uncompleted, reschedule if needed
      const hasSms = (reminder.notificationMode === 'sms' || reminder.notificationMode === 'both');
      const hasPhone = reminder.phone !== null;
      const isFuture = new Date(reminder.datetime) > new Date();
      
      if (hasSms && hasPhone && isFuture) {
        schedulerService.rescheduleReminder(reminder);
        console.log(`🔄 Rescheduled SMS for uncompleted reminder ${reminder._id}`);
      }
    }

    res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Manually send SMS notification for a reminder
// @route   POST /api/reminders/:id/send-sms
// @access  Private
const sendReminderSms = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    // Check if phone number exists
    if (!reminder.phone) {
      return res.status(400).json({
        success: false,
        message: 'No phone number associated with this reminder',
      });
    }

    // Check if SMS notification is enabled
    if (reminder.notificationMode !== 'sms' && reminder.notificationMode !== 'both') {
      return res.status(400).json({
        success: false,
        message: 'SMS notification is not enabled for this reminder',
      });
    }

    // Send SMS
    const result = await termiiService.sendReminderNotification(reminder, reminder.phone);

    if (result.success) {
      // Update reminder with notification status
      reminder.notified = true;
      await reminder.save();

      return res.status(200).json({
        success: true,
        message: 'SMS sent successfully',
        data: {
          messageId: result.messageId,
          messageIdStr: result.messageIdStr,
          balance: result.balance,
          user: result.user
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send SMS',
        error: result.error
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// ⭐ NEW: Manually send email notification for a reminder
// @desc    Manually send email notification for a reminder
// @route   POST /api/reminders/:id/send-email
// @access  Private
const sendReminderEmail = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    // Check if email exists
    if (!reminder.email) {
      return res.status(400).json({
        success: false,
        message: 'No email address associated with this reminder',
      });
    }

    // Check if email notification is enabled
    if (reminder.notificationMode !== 'email' && reminder.notificationMode !== 'both') {
      return res.status(400).json({
        success: false,
        message: 'Email notification is not enabled for this reminder',
      });
    }

    // Send email
    const result = await emailService.sendReminderEmail(reminder, reminder.email);

    if (result.success) {
      // Update reminder with email status
      reminder.emailSent = true;
      await reminder.save();

      return res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: {
          messageId: result.messageId,
          email: result.email,
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = {
  createReminder,
  getReminders,
  getReminder,
  updateReminder,
  deleteReminder,
  toggleComplete,
  sendReminderSms,
  sendReminderEmail,
};