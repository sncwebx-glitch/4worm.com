const mongoose = require('mongoose');

// Jewel types that can be collected in-game
const JEWEL_TYPES = ['ruby', 'emerald', 'sapphire', 'diamond', 'amethyst'];

// Payout cooldown: 3 hours in milliseconds
const PAYOUT_COOLDOWN_MS = 3 * 60 * 60 * 1000;

// Conversion rate: jewels per USD cent (configurable via env)
// Default: 10000 jewels = $0.01 (1 cent), so 1,000,000 jewels = $1.00
const JEWELS_PER_CENT = parseInt(process.env.JEWELS_PER_CENT || '10000', 10);

const jewelLedgerEntry = new mongoose.Schema({
  type:      { type: String, enum: JEWEL_TYPES, required: true },
  amount:    { type: Number, required: true, min: 1 },
  source:    { type: String, enum: ['gameplay', 'bonus', 'referral'], default: 'gameplay' },
  earnedAt:  { type: Date, default: Date.now }
}, { _id: false });

const payoutHistoryEntry = new mongoose.Schema({
  jewelsRedeemed: { type: Number, required: true },
  usdAmount:      { type: Number, required: true },   // in dollars (float)
  paypalPayoutId: { type: String },
  paypalBatchId:  { type: String },
  status:         { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  requestedAt:    { type: Date, default: Date.now },
  completedAt:    { type: Date }
}, { _id: true });

const gameSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true          // one game profile per user
  },

  // Current jewel balances by type
  jewels: {
    ruby:      { type: Number, default: 0, min: 0 },
    emerald:   { type: Number, default: 0, min: 0 },
    sapphire:  { type: Number, default: 0, min: 0 },
    diamond:   { type: Number, default: 0, min: 0 },
    amethyst:  { type: Number, default: 0, min: 0 }
  },

  // Total lifetime jewels ever earned (never decremented)
  totalJewelsEarned: { type: Number, default: 0, min: 0 },

  // Recent earn ledger (last 50 entries)
  ledger: { type: [jewelLedgerEntry], default: [] },

  // 3-hour payout cooldown tracking
  lastPayoutAt: { type: Date, default: null },

  // Full payout history
  payoutHistory: { type: [payoutHistoryEntry], default: [] },

  // PayPal email to receive payouts (can differ from account email)
  paypalEmail: { type: String, default: null },

  // Lifetime stats
  stats: {
    gamesPlayed:    { type: Number, default: 0 },
    totalPayoutUsd: { type: Number, default: 0 },
    level:          { type: Number, default: 1 }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ── Virtual: total spendable jewels across all types ──────────────────────────
gameSchema.virtual('totalJewels').get(function () {
  return (
    this.jewels.ruby +
    this.jewels.emerald +
    this.jewels.sapphire +
    this.jewels.diamond +
    this.jewels.amethyst
  );
});

// ── Virtual: seconds remaining until next allowed payout ─────────────────────
gameSchema.virtual('secondsUntilPayout').get(function () {
  if (!this.lastPayoutAt) return 0;
  const elapsed = Date.now() - this.lastPayoutAt.getTime();
  const remaining = PAYOUT_COOLDOWN_MS - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
});

// ── Virtual: USD value of current total jewels ────────────────────────────────
gameSchema.virtual('currentValueUsd').get(function () {
  const totalJewels = this.totalJewels;
  return parseFloat((totalJewels / JEWELS_PER_CENT / 100).toFixed(4));
});

// ── Instance method: add jewels from gameplay ─────────────────────────────────
gameSchema.methods.addJewels = function (type, amount, source = 'gameplay') {
  if (!JEWEL_TYPES.includes(type)) throw new Error(`Unknown jewel type: ${type}`);
  if (amount <= 0) throw new Error('Amount must be positive');

  this.jewels[type] += amount;
  this.totalJewelsEarned += amount;

  // Keep ledger to last 50 entries
  this.ledger.push({ type, amount, source, earnedAt: new Date() });
  if (this.ledger.length > 50) this.ledger.shift();

  this.stats.gamesPlayed += 1;
  this.updatedAt = new Date();

  // Level up every 10 000 lifetime jewels
  this.stats.level = Math.max(1, Math.floor(this.totalJewelsEarned / 10000) + 1);
};

// ── Instance method: check if payout is allowed right now ────────────────────
gameSchema.methods.canPayout = function () {
  if (!this.lastPayoutAt) return true;
  return Date.now() - this.lastPayoutAt.getTime() >= PAYOUT_COOLDOWN_MS;
};

// ── Instance method: deduct jewels for a payout, return USD amount ────────────
gameSchema.methods.redeemJewels = function (jewelsToRedeem) {
  const total = this.totalJewels;
  if (jewelsToRedeem > total) throw new Error('Insufficient jewels');
  if (jewelsToRedeem <= 0) throw new Error('Amount must be positive');

  // Deduct proportionally across all jewel types
  let remaining = jewelsToRedeem;
  for (const type of JEWEL_TYPES) {
    if (remaining <= 0) break;
    const deduct = Math.min(this.jewels[type], remaining);
    this.jewels[type] -= deduct;
    remaining -= deduct;
  }

  const usdAmount = parseFloat((jewelsToRedeem / JEWELS_PER_CENT / 100).toFixed(4));
  this.lastPayoutAt = new Date();
  this.stats.totalPayoutUsd = parseFloat((this.stats.totalPayoutUsd + usdAmount).toFixed(4));
  this.updatedAt = new Date();

  return usdAmount;
};

gameSchema.set('toJSON', { virtuals: true });
gameSchema.set('toObject', { virtuals: true });

gameSchema.statics.PAYOUT_COOLDOWN_MS = PAYOUT_COOLDOWN_MS;
gameSchema.statics.JEWEL_TYPES = JEWEL_TYPES;
gameSchema.statics.JEWELS_PER_CENT = JEWELS_PER_CENT;

module.exports = mongoose.model('Game', gameSchema);
