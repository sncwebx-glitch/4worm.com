const express = require('express');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');
const router = express.Router();

// Get User Profile
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update User Profile
router.put('/profile', isAuthenticated, async (req, res) => {
  try {
    const { firstName, lastName, phone, bio, avatar, latitude, longitude, address, city, state, zipCode } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        firstName,
        lastName,
        phone,
        bio,
        avatar,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
          address,
          city,
          state,
          zipCode
        }
      },
      { new: true }
    );
    
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Become Seller
router.post('/become-seller', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isSeller: true },
      { new: true }
    );
    
    res.json({ message: 'You are now a seller', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Seller Info
router.get('/:userId/seller-info', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('firstName lastName rating reviewCount avatar bio isSeller sellerVerified');
    if (!user || !user.isSeller) return res.status(404).json({ error: 'Seller not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
