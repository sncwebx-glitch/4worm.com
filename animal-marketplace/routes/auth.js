const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, latitude, longitude } = req.body;
    
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    });
    
    await user.save();
    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', passport.authenticate('local', {
  failureMessage: true
}), (req, res) => {
  res.json({ 
    message: 'Login successful', 
    user: {
      id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      isSeller: req.user.isSeller
    }
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Logged out successfully' });
  });
});

// Check Auth Status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;
