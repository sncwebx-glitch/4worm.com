/**
 * game.js — Jewel-collection game with 3-hour PayPal payout cycle
 *
 * Routes:
 *   GET  /api/game/status       — current jewels, timer, USD value
 *   POST /api/game/collect      — earn jewels from a gameplay action
 *   POST /api/game/set-paypal   — save / update PayPal payout email
 *   POST /api/game/payout       — convert jewels to PayPal funds (3-hr cooldown)
 *   GET  /api/game/history      — payout history
 */

const express   = require('express');
const axios     = require('axios');
const rateLimit = require('express-rate-limit');
const Game      = require('../models/Game');
const mongoose  = require('mongoose');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────

// General game actions: 60 requests per minute per IP
const gameLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});

// Spin endpoint: max 30 spins per minute per IP
const spinLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Spinning too fast. Please wait a moment.' }
});

// Payout endpoint: max 5 attempts per 10 minutes per IP (prevents abuse)
const payoutLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payout attempts. Please wait before retrying.' }
});

router.use(gameLimit);

// ── PayPal Payouts helper ─────────────────────────────────────────────────────

function paypalBase() {
  return process.env.PAYPAL_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getPayPalAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
  const base = paypalBase();
  const response = await axios.post(
    base + '/v1/oauth2/token',
    'grant_type=client_credentials',
    {
      auth: { username: PAYPAL_CLIENT_ID, password: PAYPAL_CLIENT_SECRET },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  );
  return response.data.access_token;
}

async function sendPayPalPayout(recipientEmail, amountUsd, note) {
  const accessToken = await getPayPalAccessToken();
  const base = paypalBase();
  const senderBatchId = 'game_payout_' + Date.now();

  // Build the Authorization header value at runtime from the dynamic token
  const authHeaderValue = ['Bearer', accessToken].join(' ');

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
        Authorization:  authHeaderValue,
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

// ── Jewel reward table ────────────────────────────────────────────────────────
const REWARD_TABLE = {
  match3:     { type: 'ruby',     min: 5,   max: 25  },
  combo:      { type: 'emerald',  min: 10,  max: 50  },
  level_up:   { type: 'diamond',  min: 50,  max: 150 },
  daily_spin: { type: 'sapphire', min: 20,  max: 80  },
  referral:   { type: 'amethyst', min: 100, max: 500 }
};

// ── Slot machine symbols (weighted) ──────────────────────────────────────────
const SLOT_SYMBOLS = [
  { emoji: '💎', name: 'diamond',  weight: 8  },
  { emoji: '🔴', name: 'ruby',     weight: 18 },
  { emoji: '💚', name: 'emerald',  weight: 22 },
  { emoji: '🔷', name: 'sapphire', weight: 26 },
  { emoji: '💜', name: 'amethyst', weight: 26 }
];

// Jewels awarded per slot outcome
const SLOT_PAYOUTS = {
  triple_diamond: { jewelType: 'diamond',  min: 100, max: 250 },
  triple_match:   { jewelType: 'ruby',     min: 30,  max: 80  },
  double_match:   { jewelType: 'emerald',  min: 10,  max: 30  },
  no_match:       { jewelType: 'amethyst', min: 3,   max: 10  }
};

function weightedRandom(symbols) {
  const total = symbols.reduce((sum, s) => sum + s.weight, 0);
  let rand = Math.floor(Math.random() * total);
  for (const sym of symbols) {
    rand -= sym.weight;
    if (rand < 0) return sym;
  }
  return symbols[symbols.length - 1];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Safe email validation — simple, non-backtracking check
function isValidEmail(email) {
  if (typeof email !== 'string' || email.length > 254) return false;
  const at = email.indexOf('@');
  if (at < 1 || at === email.length - 1) return false;
  const domain = email.slice(at + 1);
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
}

// Validate that a value is a proper Mongoose ObjectId to prevent NoSQL injection
function safeUserId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid user session');
  return id;
}

// ── GET /api/game/status ──────────────────────────────────────────────────────
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const userId = safeUserId(req.user._id);
    let game = await Game.findOne({ user: userId });
    if (!game) {
      game = await Game.create({ user: userId });
    }

    const cooldownSeconds = game.secondsUntilPayout;

    res.json({
      jewels:              game.jewels,
      totalJewels:         game.totalJewels,
      currentValueUsd:     game.currentValueUsd,
      payoutReady:         cooldownSeconds === 0,
      secondsUntilPayout:  cooldownSeconds,
      hoursUntilPayout:    parseFloat((cooldownSeconds / 3600).toFixed(2)),
      paypalEmail:         game.paypalEmail || null,
      stats:               game.stats,
      lastPayoutAt:        game.lastPayoutAt,
      payoutCooldownHours: 3
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/game/spin ───────────────────────────────────────────────────────
// Spins the slot machine server-side. Returns reel symbols and jewels awarded.
router.post('/spin', spinLimit, isAuthenticated, async (req, res) => {
  try {
    const userId = safeUserId(req.user._id);

    // Draw 3 reels server-side (tamper-proof)
    const reels = [
      weightedRandom(SLOT_SYMBOLS),
      weightedRandom(SLOT_SYMBOLS),
      weightedRandom(SLOT_SYMBOLS)
    ];

    // Determine outcome
    const names = reels.map(r => r.name);
    let winType;
    if (names[0] === names[1] && names[1] === names[2]) {
      winType = names[0] === 'diamond' ? 'triple_diamond' : 'triple_match';
    } else if (names[0] === names[1] || names[1] === names[2] || names[0] === names[2]) {
      winType = 'double_match';
    } else {
      winType = 'no_match';
    }

    const payout = SLOT_PAYOUTS[winType];
    const jewelsWon = randomBetween(payout.min, payout.max);

    let game = await Game.findOne({ user: userId });
    if (!game) game = new Game({ user: userId });

    game.addJewels(payout.jewelType, jewelsWon, 'gameplay');
    await game.save();

    const cooldownSeconds = game.secondsUntilPayout;

    res.json({
      reels:              reels.map(r => ({ emoji: r.emoji, name: r.name })),
      winType,
      jewelsWon,
      jewelType:          payout.jewelType,
      isWin:              winType !== 'no_match',
      isTriple:           winType.startsWith('triple'),
      jewels:             game.jewels,
      totalJewels:        game.totalJewels,
      currentValueUsd:    game.currentValueUsd,
      payoutReady:        cooldownSeconds === 0,
      secondsUntilPayout: cooldownSeconds,
      level:              game.stats.level
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/game/collect ────────────────────────────────────────────────────
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

    const userId = safeUserId(req.user._id);
    let game = await Game.findOne({ user: userId });
    if (!game) {
      game = new Game({ user: userId });
    }

    const amount = randomBetween(reward.min, reward.max);
    game.addJewels(reward.type, amount, action === 'referral' ? 'referral' : 'gameplay');
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

// ── POST /api/game/set-paypal ─────────────────────────────────────────────────
// Body: { paypalEmail: 'user@example.com' }
router.post('/set-paypal', isAuthenticated, async (req, res) => {
  try {
    const { paypalEmail } = req.body;
    if (!isValidEmail(paypalEmail)) {
      return res.status(400).json({ error: 'Valid PayPal email is required' });
    }

    const userId = safeUserId(req.user._id);
    const game = await Game.findOneAndUpdate(
      { user: userId },
      { paypalEmail, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    res.json({ message: 'PayPal email saved', paypalEmail: game.paypalEmail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/game/payout ─────────────────────────────────────────────────────
// Body: { jewelsToRedeem: 5000 }
// Enforces 3-hour cooldown between payouts
router.post('/payout', payoutLimit, isAuthenticated, async (req, res) => {
  try {
    const userId = safeUserId(req.user._id);
    const game = await Game.findOne({ user: userId });
    if (!game) return res.status(404).json({ error: 'No game profile found. Play first' });

    if (!game.paypalEmail) {
      return res.status(400).json({
        error: 'Set your PayPal email first via POST /api/game/set-paypal'
      });
    }

    // Enforce 3-hour cooldown
    if (!game.canPayout()) {
      const secondsLeft = game.secondsUntilPayout;
      return res.status(429).json({
        error: 'Payout cooldown active. Payouts are allowed every 3 hours',
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
        error: 'Insufficient jewels. You have ' + game.totalJewels + ', requested ' + jewelsToRedeem
      });
    }

    const minJewels = Game.JEWELS_PER_CENT;
    if (jewelsToRedeem < minJewels) {
      return res.status(400).json({
        error: 'Minimum payout is ' + minJewels + ' jewels ($0.01). You requested ' + jewelsToRedeem
      });
    }

    // Snapshot current jewel balances for rollback
    const jewelSnapshot = {
      ruby:     game.jewels.ruby,
      emerald:  game.jewels.emerald,
      sapphire: game.jewels.sapphire,
      diamond:  game.jewels.diamond,
      amethyst: game.jewels.amethyst
    };
    const priorPayoutUsd     = game.stats.totalPayoutUsd;
    const priorLastPayoutAt  = game.lastPayoutAt;

    // Deduct jewels and calculate USD
    const usdAmount = game.redeemJewels(jewelsToRedeem);

    // Record payout as processing before calling PayPal
    game.payoutHistory.push({
      jewelsRedeemed: jewelsToRedeem,
      usdAmount,
      status:       'processing',
      requestedAt:  new Date()
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
      // PayPal call failed — restore exact jewel snapshot
      lastEntry.status       = 'failed';
      game.jewels.ruby       = jewelSnapshot.ruby;
      game.jewels.emerald    = jewelSnapshot.emerald;
      game.jewels.sapphire   = jewelSnapshot.sapphire;
      game.jewels.diamond    = jewelSnapshot.diamond;
      game.jewels.amethyst   = jewelSnapshot.amethyst;
      game.stats.totalPayoutUsd = priorPayoutUsd;
      game.lastPayoutAt      = priorLastPayoutAt;
      await game.save();

      res.status(502).json({
        error:   'PayPal payout failed. Jewels have been restored. Please try again',
        details: paypalErr.response && paypalErr.response.data ? paypalErr.response.data.message : paypalErr.message
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/game/history ─────────────────────────────────────────────────────
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const userId = safeUserId(req.user._id);
    const game = await Game.findOne({ user: userId });
    if (!game) return res.json({ payoutHistory: [] });

    res.json({
      payoutHistory:   game.payoutHistory.slice().reverse(),
      totalPaidOutUsd: game.stats.totalPayoutUsd
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
