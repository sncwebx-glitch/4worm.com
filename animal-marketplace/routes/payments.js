const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const Listing = require('../models/Listing');
const { isAuthenticated } = require('../middleware/auth');
const router = express.Router();

// Create Payment Intent
router.post('/create-intent', isAuthenticated, async (req, res) => {
  try {
    const { listingId, amount, exchangeMethod } = req.body;
    
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: {
        listingId: listingId.toString(),
        buyerId: req.user._id.toString(),
        sellerId: listing.seller.toString()
      }
    });
    
    const payment = new Payment({
      buyer: req.user._id,
      seller: listing.seller,
      listing: listingId,
      amount,
      stripePaymentIntentId: paymentIntent.id,
      paymentMethod: 'credit_card',
      exchangeMethod,
      status: 'pending'
    });
    
    await payment.save();
    res.json({ clientSecret: paymentIntent.client_secret, paymentId: payment._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm Payment
router.post('/confirm', isAuthenticated, async (req, res) => {
  try {
    const { paymentId, stripePaymentIntentId } = req.body;
    
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      payment.status = 'completed';
      await payment.save();
      
      // Update listing status if full purchase
      if (payment.transactionType === 'purchase') {
        await Listing.findByIdAndUpdate(payment.listing, { status: 'sold' });
      }
      
      res.json({ message: 'Payment successful', payment });
    } else {
      res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Payment History
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [
        { buyer: req.user._id },
        { seller: req.user._id }
      ]
    }).populate('listing seller buyer').sort({ createdAt: -1 });
    
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// In-Person Payment (No Stripe)
router.post('/in-person', isAuthenticated, async (req, res) => {
  try {
    const { listingId, amount, exchangeMethod } = req.body;
    
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    
    const payment = new Payment({
      buyer: req.user._id,
      seller: listing.seller,
      listing: listingId,
      amount,
      paymentMethod: 'in_person',
      exchangeMethod,
      status: 'pending'
    });
    
    await payment.save();
    res.json({ message: 'In-person transaction created', payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
