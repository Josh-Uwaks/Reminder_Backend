// remindme-backend/routes/reminderRoutes.js
const express = require('express');
const router = express.Router();
const {
  createReminder,
  getReminders,
  getReminder,
  updateReminder,
  deleteReminder,
  toggleComplete,
  sendReminderSms,
  sendReminderEmail,
} = require('../controllers/reminderController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// CRUD routes
router.route('/')
  .get(getReminders)
  .post(createReminder);

router.route('/:id')
  .get(getReminder)
  .put(updateReminder)
  .delete(deleteReminder);

router.patch('/:id/toggle', toggleComplete);

// SMS routes
router.post('/:id/send-sms', sendReminderSms);

// ⭐ NEW: Email routes
router.post('/:id/send-email', sendReminderEmail);

module.exports = router;