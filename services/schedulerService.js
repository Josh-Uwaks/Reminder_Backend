// remindme-backend/services/schedulerService.js
const schedule = require('node-schedule');
const Reminder = require('../models/Reminder');
const termiiService = require('./termiiService');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Schedule a reminder notification
   */
  scheduleReminder(reminder) {
    const scheduledTime = new Date(reminder.datetime);
    
    // Cancel existing job if any
    this.cancelJob(reminder._id);
    
    // Schedule the job
    const job = schedule.scheduleJob(scheduledTime, async () => {
      console.log(`⏰ Sending scheduled SMS for reminder: ${reminder._id}`);
      
      try {
        // Check if reminder is still active
        const currentReminder = await Reminder.findById(reminder._id);
        if (!currentReminder || currentReminder.completed) {
          console.log(`⏭️ Reminder ${reminder._id} is completed or deleted, skipping SMS`);
          return;
        }
        
        // Send SMS
        const result = await termiiService.sendReminderNotification(
          currentReminder, 
          currentReminder.phone
        );
        
        if (result.success) {
          console.log(`✅ Scheduled SMS sent for reminder ${reminder._id}`);
          await Reminder.findByIdAndUpdate(reminder._id, { notified: true });
        } else {
          console.error(`❌ Failed to send scheduled SMS for reminder ${reminder._id}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Error sending scheduled SMS for reminder ${reminder._id}:`, error);
      }
    });
    
    this.jobs.set(reminder._id.toString(), job);
    console.log(`📅 Scheduled reminder ${reminder._id} for ${scheduledTime.toLocaleString()}`);
  }

  /**
   * Cancel a scheduled job
   */
  cancelJob(reminderId) {
    const job = this.jobs.get(reminderId.toString());
    if (job) {
      job.cancel();
      this.jobs.delete(reminderId.toString());
      console.log(`🗑️ Cancelled scheduled job for reminder ${reminderId}`);
      return true;
    }
    return false;
  }

  /**
   * Reschedule a reminder
   */
  rescheduleReminder(reminder) {
    this.cancelJob(reminder._id);
    if (!reminder.completed && reminder.phone && 
        (reminder.notificationMode === 'sms' || reminder.notificationMode === 'both')) {
      this.scheduleReminder(reminder);
      return true;
    }
    return false;
  }

  /**
   * Load all pending reminders on server start
   */
  async loadPendingReminders() {
    try {
      const pendingReminders = await Reminder.find({
        completed: false,
        datetime: { $gt: new Date() },
        notificationMode: { $in: ['sms', 'both'] },
        phone: { $ne: null }
      });
      
      console.log(`📋 Loading ${pendingReminders.length} pending reminders`);
      pendingReminders.forEach(reminder => {
        this.scheduleReminder(reminder);
      });
      
      return pendingReminders.length;
    } catch (error) {
      console.error('❌ Error loading pending reminders:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs() {
    const jobs = [];
    this.jobs.forEach((job, id) => {
      jobs.push({
        id,
        nextInvocation: job.nextInvocation ? job.nextInvocation.toLocaleString() : null
      });
    });
    return jobs;
  }
}

module.exports = new SchedulerService();