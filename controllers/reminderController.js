// remindme-backend/controllers/reminderController.js
const Reminder = require('../models/Reminder');
const termiiService = require('../services/termiiService');

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

    // Send SMS notification immediately if SMS is enabled
    let smsSent = false;
    if (notificationMode === 'sms' || notificationMode === 'both') {
      // Send notification asynchronously (don't await to not block response)
      termiiService.sendReminderNotification(reminder, phone)
        .then(result => {
          if (result.success) {
            console.log(`✅ SMS sent for reminder ${reminder._id}:`, result.messageId);
            // Update reminder with notification status
            Reminder.findByIdAndUpdate(reminder._id, { notified: true })
              .catch(err => console.error('Error updating notification status:', err));
          } else {
            console.error(`❌ Failed to send SMS for reminder ${reminder._id}:`, result.error);
          }
        })
        .catch(error => {
          console.error('Error sending SMS:', error);
        });
      smsSent = true;
    }

    res.status(201).json({
      success: true,
      data: reminder,
      message: smsSent 
        ? 'Reminder created. SMS notification sent.' 
        : 'Reminder created successfully.',
      smsSent
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

    // Send SMS notification if updated to include SMS
    if (notificationMode === 'sms' || notificationMode === 'both') {
      if (reminder.phone) {
        termiiService.sendReminderNotification(reminder, reminder.phone)
          .then(result => {
            if (result.success) {
              console.log(`✅ SMS sent for updated reminder ${reminder._id}:`, result.messageId);
              Reminder.findByIdAndUpdate(reminder._id, { notified: true })
                .catch(err => console.error('Error updating notification status:', err));
            } else {
              console.error(`❌ Failed to send SMS for updated reminder ${reminder._id}:`, result.error);
            }
          })
          .catch(error => {
            console.error('Error sending SMS:', error);
          });
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

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
// @access  Private
const deleteReminder = async (req, res) => {
  try {
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

module.exports = {
  createReminder,
  getReminders,
  getReminder,
  updateReminder,
  deleteReminder,
  toggleComplete,
  sendReminderSms
};