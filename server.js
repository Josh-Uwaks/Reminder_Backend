// backend/server.js
const dotenv = require('dotenv');
dotenv.config(); // ✅ MUST BE FIRST - before any other imports

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const reminderRoutes = require('./routes/reminderRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.88.21:3000', 'https://reminder-application-vue.onrender.com'],
  credentials: true
}));
app.use(express.json());

// Request logging (minimal)
app.use((req, res, next) => {
  console.log(`➡️  ${req.method} ${req.url}`);
  next();
});

// Database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reminders', reminderRoutes);
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});