const express = require('express');
const Listing = require('../models/Listing');
const { isAuthenticated } = require('../middleware/auth');
const haversine = require('haversine-distance');
const router = express.Router();

// Create Listing
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { title, description, category, subCategory, price, priceType, images, latitude, longitude, address, petDetails, serviceDetails, exchangeType } = req.body;
    
    const listing = new Listing({
      seller: req.user._id,
      title,
      description,
      category,
      subCategory,
      price,
      priceType,
      images,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
        address
      },
      petDetails,
      serviceDetails,
      exchangeType
    });
    
    await listing.save();
    res.status(201).json({ message: 'Listing created', listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Nearby Listings
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;
    
    const listings = await Listing.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000 // convert km to meters
        }
      },
      status: 'active'
    }).populate('seller', 'firstName lastName rating avatar');
    
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search Listings by Category
router.get('/search', async (req, res) => {
  try {
    const { category, latitude, longitude, radius = 10, keyword } = req.query;
    
    const query = {
      status: 'active',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000
        }
      }
    };
    
    if (category) query.category = category;
    if (keyword) query.$text = { $search: keyword };
    
    const listings = await Listing.find(query).populate('seller', 'firstName lastName rating avatar');
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Listing
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('seller', 'firstName lastName rating reviewCount avatar bio');
    
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Listing
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    Object.assign(listing, req.body);
    await listing.save();
    res.json({ message: 'Listing updated', listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Listing
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await Listing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
