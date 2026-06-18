const express = require('express');
const router = express.Router();
const {
  createReminder,
  getReminders,
  getReminder,
  updateReminder,
  deleteReminder,
  toggleComplete,
} = require('../controllers/reminderController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.route('/')
  .post(createReminder)
  .get(getReminders);

router.route('/:id')
  .get(getReminder)
  .put(updateReminder)
  .delete(deleteReminder);

router.patch('/:id/toggle', toggleComplete);

module.exports = router;