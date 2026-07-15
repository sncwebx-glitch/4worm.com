/**
 * game.js — Jewel-collection game with 3-hour PayPal payout cycle
 *
 * Routes:
 *   GET  /api/game/status          — current jewels, timer, USD value
 *   POST /api/game/collect         — earn jewels from a gameplay action
 *   POST /api/game/set-paypal      — save / update PayPal payout email
 *   POST /api/game/payout          — convert jewels to PayPal funds (3-hr cooldown)
 *   GET  /api/game/history         — payout history
 */

const express = require('express');
const axios   = require('axios');
const Game    = require('../models/Game');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// -- PayPal Payouts helper --
async function getPayPalAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV } = process.env;
  const base =
    PAYPAL_ENV === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

  const response = await axios.post(
    base + '/v1/oauth2/token',
    'grant_type=client_credentials',
    {
      auth: { username: PAYPAL_CLIENT_ID, password: PAYPAL_CLIENT_SECRET },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  );
  return { token: response.data.access_token, base };
}

async function sendPayPalPayout(recipientEmail, amountUsd, note) {
  const { token, base } = await getPayPalAccessToken();
  const senderBatchId = 'game_payout_' + Date.now();
  const authHeader = '******' + token;

  const response = await axios.post(
    base + '/v1/payments/payouts',
    {
      sender_batch_header: {
        sender_batch_id: senderBatchId,
        email_subject:   '4worm.com — Your jewel payout is here!',
        email_message:   note || 'Your game jewels have been converted to cash. Thanks for playing!'
      },
      items: [
        {
          recipient_type: 'EMAIL',
          receiver:       recipientEmail,
          amount:         { value: amountUsd.toFixed(2), currency: 'USD' },
          note:           note || 'Jewel payout',
          sender_item_id: 'item_' + senderBatchId
        }
      ]
    },
    {
      headers: {
        Authorization:  authHeader,
        'Content-Type': 'application/json'
      }
    }
  );

  return {
    batchId:  response.data.batch_header.payout_batch_id,
    payoutId: response.data.batch_header.sender_batch_header.sender_batch_id,
    status:   response.data.batch_header.batch_status
  };
}

// -- Jewel reward table (configurable gameplay actions) --
const REWARD_TABLE = {
  match3:     { type: 'ruby',     min: 5,   max: 25  },
  combo:      { type: 'emerald',  min: 10,  max: 50  },
  level_up:   { type: 'diamond',  min: 50,  max: 150 },
  daily_spin: { type: 'sapphire', min: 20,  max: 80  },
  referral:   { type: 'amethyst', min: 100, max: 500 }
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// -- GET /api/game/status --
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    let game = await Game.findOne({ user: req.user._id });
    if (!game) {
      game = await Game.create({ user: req.user._id });
    }

    const cooldownSeconds = game.secondsUntilPayout;

    res.json({
      jewels:             game.jewels,
      totalJewels:        game.totalJewels,
      currentValueUsd:    game.currentValueUsd,
      payoutReady:        cooldownSeconds === 0,
      secondsUntilPayout: cooldownSeconds,
      hoursUntilPayout:   parseFloat((cooldownSeconds / 3600).toFixed(2)),
      paypalEmail:        game.paypalEmail || null,
      stats:              game.stats,
      lastPayoutAt:       game.lastPayoutAt,
      payoutCooldownHours: 3
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- POST /api/game/collect --
// Body: { action: 'match3' | 'combo' | 'level_up' | 'daily_spin' | 'referral' }
router.post('/collect', isAuthenticated, async (req, res) => {
  try {
    const { action } = req.body;

    const reward = REWARD_TABLE[action];
    if (!reward) {
      return res.status(400).json({
        error: 'Unknown action. Valid actions: ' + Object.keys(REWARD_TABLE).join(', ')
      });
    }

    let game = await Game.findOne({ user: req.user._id });
    if (!game) {
      game = new Game({ user: req.user._id });
    }

    const amount = randomBetween(reward.min, reward.max);
    const source = action === 'referral' ? 'referral' : 'gameplay';
    game.addJewels(reward.type, amount, source);
    await game.save();

    res.json({
      collected:       { type: reward.type, amount },
      jewels:          game.jewels,
      totalJewels:     game.totalJewels,
      currentValueUsd: game.currentValueUsd,
      level:           game.stats.level
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- POST /api/game/set-paypal --
// Body: { paypalEmail: 'user@example.com' }
router.post('/set-paypal', isAuthenticated, async (req, res) => {
  try {
    const { paypalEmail } = req.body;
    if (!paypalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
      return res.status(400).json({ error: 'Valid PayPal email is required' });
    }

    const game = await Game.findOneAndUpdate(
      { user: req.user._id },
      { paypalEmail, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    res.json({ message: 'PayPal email saved', paypalEmail: game.paypalEmail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- POST /api/game/payout --
// Body: { jewelsToRedeem: 5000 }
// Enforces 3-hour cooldown between payouts
router.post('/payout', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findOne({ user: req.user._id });
    if (!game) return res.status(404).json({ error: 'No game profile found. Play first!' });

    // Require PayPal email
    if (!game.paypalEmail) {
      return res.status(400).json({
        error: 'Set your PayPal email first via POST /api/game/set-paypal'
      });
    }

    // Enforce 3-hour cooldown
    if (!game.canPayout()) {
      const secondsLeft = game.secondsUntilPayout;
      return res.status(429).json({
        error: 'Payout cooldown active. Payouts are allowed every 3 hours.',
        secondsUntilPayout: secondsLeft,
        hoursUntilPayout:   parseFloat((secondsLeft / 3600).toFixed(2)),
        nextPayoutAt: new Date(game.lastPayoutAt.getTime() + Game.PAYOUT_COOLDOWN_MS)
      });
    }

    const jewelsToRedeem = parseInt(req.body.jewelsToRedeem, 10);
    if (!jewelsToRedeem || jewelsToRedeem <= 0) {
      return res.status(400).json({ error: 'jewelsToRedeem must be a positive integer' });
    }

    if (jewelsToRedeem > game.totalJewels) {
      return res.status(400).json({
        error: 'Insufficient jewels. You have ' + game.totalJewels + ', requested ' + jewelsToRedeem + '.' 
      });
    }

    // Minimum payout: 1 cent ($0.01) worth of jewels
    const minJewels = Game.JEWELS_PER_CENT;
    if (jewelsToRedeem < minJewels) {
      return res.status(400).json({
        error: 'Minimum payout is ' + minJewels + ' jewels ($0.01). You requested ' + jewelsToRedeem + '.' 
      });
    }

    // Snapshot for rollback
    const jewelSnapshot = Object.assign({}, game.jewels.toObject ? game.jewels.toObject() : game.jewels);

    // Deduct jewels and calculate USD
    const usdAmount = game.redeemJewels(jewelsToRedeem);

    // Record payout as processing before calling PayPal
    game.payoutHistory.push({
      jewelsRedeemed: jewelsToRedeem,
      usdAmount,
      status: 'processing',
      requestedAt: new Date()
    });
    await game.save();

    const lastEntry = game.payoutHistory[game.payoutHistory.length - 1];

    try {
      const paypalResult = await sendPayPalPayout(
        game.paypalEmail,
        usdAmount,
        '4worm.com game payout — ' + jewelsToRedeem.toLocaleString() + ' jewels'
      );

      lastEntry.paypalBatchId  = paypalResult.batchId;
      lastEntry.paypalPayoutId = paypalResult.payoutId;
      lastEntry.status         = 'completed';
      lastEntry.completedAt    = new Date();
      await game.save();

      res.json({
        message:         jewelsToRedeem.toLocaleString() + ' jewels converted to $' + usdAmount.toFixed(2) + ' USD sent to ' + game.paypalEmail,
        usdAmount,
        jewelsRedeemed:  jewelsToRedeem,
        paypalBatchId:   paypalResult.batchId,
        remainingJewels: game.totalJewels,
        nextPayoutAt:    new Date(game.lastPayoutAt.getTime() + Game.PAYOUT_COOLDOWN_MS)
      });
    } catch (paypalErr) {
      // PayPal call failed — roll back jewel deduction
      lastEntry.status = 'failed';
      game.jewels.ruby     = jewelSnapshot.ruby     + (jewelsToRedeem <= jewelSnapshot.ruby ? jewelsToRedeem : jewelSnapshot.ruby);
      game.jewels.emerald  = jewelSnapshot.emerald;
      game.jewels.sapphire = jewelSnapshot.sapphire;
      game.jewels.diamond  = jewelSnapshot.diamond;
      game.jewels.amethyst = jewelSnapshot.amethyst;
      game.stats.totalPayoutUsd = parseFloat((game.stats.totalPayoutUsd - usdAmount).toFixed(4));
      game.lastPayoutAt = null;
      await game.save();

      res.status(502).json({
        error:   'PayPal payout failed. Jewels have been restored. Please try again.',
        details: paypalErr.response && paypalErr.response.data ? paypalErr.response.data.message : paypalErr.message
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- GET /api/game/history --
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findOne({ user: req.user._id });
    if (!game) return res.json({ payoutHistory: [] });

    res.json({
      payoutHistory:    game.payoutHistory.slice().reverse(),
      totalPaidOutUsd:  game.stats.totalPayoutUsd
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
