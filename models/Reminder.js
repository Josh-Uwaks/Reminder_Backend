// remindme-backend/models/Reminder.js
const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  datetime: {
    type: Date,
    required: [true, 'Date and time is required'],
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  notificationMode: {
    type: String,
    enum: ['browser', 'email', 'sms', 'both'],
    default: 'browser',
  },
  email: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
    default: null,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  notified: {
    type: Boolean,
    default: false,
  },
  emailSent: {      
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Reminder', reminderSchema);