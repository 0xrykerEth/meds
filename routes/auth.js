const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser } = require('../controller/authController');
const { authenticateToken } = require('../middleware/auth');

// Register route
router.post('/register', register);

// Login route
router.post('/login', login);

// Get current user (protected route)
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;