const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized - No token',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const session = await Session.findOne({ token, userId: decoded.id });
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
      });
    }

    req.userId = decoded.id;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized - Invalid token',
    });
  }
};

module.exports = { protect };