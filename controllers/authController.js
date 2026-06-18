// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  console.log('📝 Registration attempt');
  console.log('Request body:', req.body);
  
  try {
    const { name, email, password, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Name, email, password and phone number are required',
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
    });
    
    console.log('✅ User created:', user._id, user.email);

    // Generate token
    const token = generateToken(user._id);
    console.log('🎫 Token generated');

    // Create session
    await Session.create({
      userId: user._id,
      token,
    });
    console.log('📝 Session created');

    console.log('✅ Registration successful');
    
    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        token,
      },
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  console.log('🔐 Login attempt');
  console.log('Email:', req.body.email);
  console.log('Password provided:', req.body.password ? 'Yes' : 'No');
  
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check for user
    console.log('📧 Looking for user:', email);
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
    
    console.log('✅ User found:', user._id, user.email);
    console.log('🔑 Comparing passwords...');

    // Check password
    const isPasswordMatch = await user.matchPassword(password);
    console.log('Password match result:', isPasswordMatch);
    
    if (!isPasswordMatch) {
      console.log('❌ Password mismatch for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
    
    console.log('✅ Password matched!');

    // Generate token
    const token = generateToken(user._id);
    console.log('🎫 Token generated:', token.substring(0, 20) + '...');

    // Create session
    await Session.create({
      userId: user._id,
      token,
    });
    console.log('📝 Session created');

    console.log('✅ Login successful for:', email);
    
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        token,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  console.log('🚪 Logout attempt');
  
  try {
    await Session.findOneAndDelete({ token: req.token });
    console.log('✅ Session deleted');
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  register,
  login,
  logout
};