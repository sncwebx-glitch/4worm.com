const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['animals', 'services', 'items'],
    required: true
  },
  subCategory: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  priceType: {
    type: String,
    enum: ['fixed', 'negotiable'],
    default: 'fixed'
  },
  images: [String],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: String,
    city: String,
    state: String,
    zipCode: String
  },
  petDetails: {
    species: String,
    breed: String,
    age: String,
    gender: String,
    size: String,
    vaccinated: Boolean,
    neutered: Boolean
  },
  serviceDetails: {
    serviceType: String,
    availability: String,
    experience: String
  },
  exchangeType: {
    type: String,
    enum: ['in-person', 'shipping', 'both'],
    default: 'both'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'sold'],
    default: 'active'
  },
  views: {
    type: Number,
    default: 0
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
listingSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('Listing', listingSchema);
