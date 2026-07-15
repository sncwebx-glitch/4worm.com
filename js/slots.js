/**
 * slots.js — Jewel Slots game frontend
 *
 * Communicates with /api/game/* on the animal-marketplace backend.
 * Falls back to a fully local (localStorage) mode when the backend
 * is unreachable, so the game is still playable offline.
 *
 * In memory of Dewayne Bozeman.
 */

'use strict';

// ── Configuration ─────────────────────────────────────────────────────────────
const STORAGE_KEY   = 'jwl_slots_state';
const API_KEY       = 'jwl_api_base';
const SPIN_DELAY_MS = 1800; // total spin animation time

// Retrieve saved API base or use default; user can override via the UI
function getApiBase() {
  return localStorage.getItem(API_KEY) || 'http://localhost:5000/api/game';
}

// ── Symbols (kept in sync with backend SLOT_SYMBOLS) ────────────────────────
const SYMBOLS = [
  { emoji: '💎', name: 'diamond',  weight: 8  },
  { emoji: '🔴', name: 'ruby',     weight: 18 },
  { emoji: '💚', name: 'emerald',  weight: 22 },
  { emoji: '🔷', name: 'sapphire', weight: 26 },
  { emoji: '💜', name: 'amethyst', weight: 26 }
];

// Local payout table — mirrors server values
const LOCAL_PAYOUTS = {
  triple_diamond: { jewelType: 'diamond',  min: 100, max: 250 },
  triple_match:   { jewelType: 'ruby',     min: 30,  max: 80  },
  double_match:   { jewelType: 'emerald',  min: 10,  max: 30  },
  no_match:       { jewelType: 'amethyst', min: 3,   max: 10  }
};

// Jewels per cent (must match server JEWELS_PER_CENT default)
const JEWELS_PER_CENT = 10000;

// ── State ─────────────────────────────────────────────────────────────────────
let isSpinning = false;
let isOnline   = false;
let countdownInterval = null;

let gameState = {
  jewels: { ruby: 0, emerald: 0, sapphire: 0, diamond: 0, amethyst: 0 },
  totalJewels: 0,
  currentValueUsd: 0,
  payoutReady: true,
  secondsUntilPayout: 0,
  paypalEmail: null
};

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildReels();
  loadLocalState();
  document.getElementById('apiBaseInput').value = getApiBase();
  fetchStatus();
  updateBalanceDisplay();
  startCountdown();
});

// ── Reel DOM builder ──────────────────────────────────────────────────────────
// Each reel strip contains enough cells to animate a smooth scroll:
// 20 random cells + 3 visible result cells at the top
const STRIP_SIZE = 20;

function buildReels() {
  for (let r = 0; r < 3; r++) {
    const strip = document.getElementById('strip' + r);
    strip.innerHTML = '';
    for (let i = 0; i < STRIP_SIZE + 3; i++) {
      const cell = document.createElement('div');
      cell.className = 'reel-cell';
      cell.textContent = randomSymbol().emoji;
      strip.appendChild(cell);
    }
  }
}

function randomSymbol() {
  const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let rand = Math.floor(Math.random() * total);
  for (const sym of SYMBOLS) {
    rand -= sym.weight;
    if (rand < 0) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(path, options) {
  const base = getApiBase();
  const res  = await fetch(base + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return res;
}

async function fetchStatus() {
  try {
    const res = await apiFetch('/status');
    if (!res.ok) throw new Error('not ok');
    const data = await res.json();
    applyServerState(data);
    setOnline(true);
  } catch {
    setOnline(false);
  }
}

function setOnline(online) {
  isOnline = online;
  const badge = document.getElementById('connBadge');
  if (online) {
    badge.className = 'conn-badge connected';
    badge.innerHTML = '<span class="dot"></span>CONNECTED';
  } else {
    badge.className = 'conn-badge offline';
    badge.innerHTML = '<span class="dot"></span>LOCAL MODE';
  }
}

// ── Spin ──────────────────────────────────────────────────────────────────────
async function spin() {
  if (isSpinning) return;
  isSpinning = true;

  const spinBtn = document.getElementById('spinBtn');
  spinBtn.disabled = true;
  spinBtn.classList.add('spinning-state');
  spinBtn.textContent = '● SPINNING ●';

  clearWinDisplay();
  startReelAnimation();

  let result;

  if (isOnline) {
    try {
      const res = await apiFetch('/spin', { method: 'POST' });
      if (res.ok) {
        result = await res.json();
      } else if (res.status === 429) {
        const data = await res.json();
        showStatusMsg('spinMsg', data.error || 'Spinning too fast!', 'error');
        resetSpinBtn(spinBtn);
        stopReelAnimation([null, null, null]);
        return;
      } else {
        throw new Error('server error');
      }
    } catch {
      setOnline(false);
      result = localSpin();
    }
  } else {
    result = localSpin();
  }

  // Wait for animation, then snap reels to result
  setTimeout(() => {
    stopReelAnimation(result.reels);

    // After reels settle, show win and update balance
    setTimeout(() => {
      applySpinResult(result);
      resetSpinBtn(spinBtn);
    }, 400);
  }, SPIN_DELAY_MS);
}

// ── Local (offline) spin logic ───────────────────────────────────────────────
function localSpin() {
  const reels = [randomSymbol(), randomSymbol(), randomSymbol()];
  const names = reels.map(r => r.name);

  let winType;
  if (names[0] === names[1] && names[1] === names[2]) {
    winType = names[0] === 'diamond' ? 'triple_diamond' : 'triple_match';
  } else if (names[0] === names[1] || names[1] === names[2] || names[0] === names[2]) {
    winType = 'double_match';
  } else {
    winType = 'no_match';
  }

  const payout    = LOCAL_PAYOUTS[winType];
  const jewelsWon = randomBetween(payout.min, payout.max);

  // Update local state
  gameState.jewels[payout.jewelType] = (gameState.jewels[payout.jewelType] || 0) + jewelsWon;
  recalcTotals();

  return {
    reels:    reels.map(r => ({ emoji: r.emoji, name: r.name })),
    winType,
    jewelsWon,
    jewelType:  payout.jewelType,
    isWin:      winType !== 'no_match',
    isTriple:   winType.startsWith('triple'),
    jewels:     gameState.jewels,
    totalJewels:     gameState.totalJewels,
    currentValueUsd: gameState.currentValueUsd,
    payoutReady:     gameState.payoutReady,
    secondsUntilPayout: gameState.secondsUntilPayout
  };
}

function recalcTotals() {
  const j = gameState.jewels;
  const total = (j.ruby || 0) + (j.emerald || 0) + (j.sapphire || 0) + (j.diamond || 0) + (j.amethyst || 0);
  gameState.totalJewels    = total;
  gameState.currentValueUsd = parseFloat((total / JEWELS_PER_CENT / 100).toFixed(4));
  saveLocalState();
}

// ── Reel animation ────────────────────────────────────────────────────────────
function startReelAnimation() {
  for (let r = 0; r < 3; r++) {
    document.getElementById('reel' + r).classList.add('spinning');
    animateReel(r);
  }
}

let reelTimers = [null, null, null];

function animateReel(reelIdx) {
  const strip = document.getElementById('strip' + reelIdx);

  function tick() {
    if (!isSpinning) return;
    // Shuffle all visible cells with random symbols
    const cells = strip.querySelectorAll('.reel-cell');
    cells.forEach(cell => {
      cell.textContent = randomSymbol().emoji;
      cell.className = 'reel-cell';
    });
    reelTimers[reelIdx] = setTimeout(tick, 60);
  }

  tick();
}

function stopReelAnimation(reels) {
  // Clear timers
  reelTimers.forEach((t, i) => { if (t) { clearTimeout(t); reelTimers[i] = null; } });

  for (let r = 0; r < 3; r++) {
    const reelEl = document.getElementById('reel' + r);
    reelEl.classList.remove('spinning');
    const strip  = document.getElementById('strip' + r);
    const cells  = strip.querySelectorAll('.reel-cell');
    const symbol = reels[r];

    // Fill random symbols in non-middle cells, put result in middle (cell index 1)
    cells.forEach((cell, idx) => {
      if (idx === 1 && symbol) {
        cell.textContent = symbol.emoji;
        cell.className   = 'reel-cell'; // glow class applied later by applySpinResult
      } else {
        cell.textContent = randomSymbol().emoji;
        cell.className   = 'reel-cell';
      }
    });
  }
}

// ── Apply spin result ─────────────────────────────────────────────────────────
function applySpinResult(result) {
  // Apply win glow to the middle cell of each reel that shows a matching symbol
  const winType = result.winType;
  const glowClass = winType === 'triple_diamond' ? 'jackpot-glow'
                  : winType.startsWith('triple')  ? 'win-glow'
                  : winType === 'double_match'     ? 'win-glow'
                  : '';

  if (glowClass) {
    // Find which symbol appears most (the matching one)
    const names = result.reels.map(r => r.name);
    const matchName = names[0] === names[1] ? names[0]
                    : names[1] === names[2] ? names[1]
                    : names[0] === names[2] ? names[0]
                    : names[0]; // triple: all same, use first

    for (let r = 0; r < 3; r++) {
      if (result.reels[r].name === matchName) {
        // Middle cell is index 1 (2nd child) in the strip
        const cell = document.querySelector('#strip' + r + ' .reel-cell:nth-child(2)');
        if (cell) cell.classList.add(glowClass);
      }
    }
  }

  // Show win message
  showWinResult(result);

  // Update balance
  applyServerState(result);
}

function showWinResult(result) {
  const el = document.getElementById('winDisplay');
  el.className = 'win-display';
  el.classList.remove('win-double', 'win-triple', 'win-jackpot', 'no-win');

  if (result.winType === 'triple_diamond') {
    el.classList.add('win-jackpot');
    el.innerHTML = '💎 JACKPOT! 💎 +' + result.jewelsWon + ' DIAMONDS!';
  } else if (result.winType === 'triple_match') {
    el.classList.add('win-triple');
    el.innerHTML = '🎉 TRIPLE! +' + result.jewelsWon + ' ' + result.jewelType.toUpperCase() + '!';
  } else if (result.winType === 'double_match') {
    el.classList.add('win-double');
    el.innerHTML = '✨ MATCH! +' + result.jewelsWon + ' ' + result.jewelType.toUpperCase();
  } else {
    el.classList.add('no-win');
    el.innerHTML = '+' + result.jewelsWon + ' ' + result.jewelType + ' — Try again!';
  }
}

function clearWinDisplay() {
  const el = document.getElementById('winDisplay');
  el.className = 'win-display';
  el.textContent = '...';
  // Remove glow from all reel cells
  document.querySelectorAll('.reel-cell.win-glow, .reel-cell.jackpot-glow').forEach(c => {
    c.classList.remove('win-glow', 'jackpot-glow');
  });
}

function resetSpinBtn(btn) {
  isSpinning = false;
  btn.disabled = false;
  btn.classList.remove('spinning-state');
  btn.textContent = 'SPIN';
}

// ── Balance display ───────────────────────────────────────────────────────────
function applyServerState(data) {
  if (data.jewels) {
    gameState.jewels            = data.jewels;
    gameState.totalJewels       = data.totalJewels       || 0;
    gameState.currentValueUsd   = data.currentValueUsd   || 0;
    gameState.payoutReady       = data.payoutReady        || false;
    gameState.secondsUntilPayout= data.secondsUntilPayout|| 0;
    if (data.paypalEmail) gameState.paypalEmail = data.paypalEmail;
    saveLocalState();
    updateBalanceDisplay();
    restartCountdown();
  }
}

function updateBalanceDisplay() {
  const j = gameState.jewels || {};

  setCount('bal-diamond',  j.diamond  || 0);
  setCount('bal-ruby',     j.ruby     || 0);
  setCount('bal-emerald',  j.emerald  || 0);
  setCount('bal-sapphire', j.sapphire || 0);
  setCount('bal-amethyst', j.amethyst || 0);

  document.getElementById('total-jewels').textContent =
    (gameState.totalJewels || 0).toLocaleString();

  document.getElementById('usd-value').textContent =
    '$' + (gameState.currentValueUsd || 0).toFixed(4);

  const redeemInput = document.getElementById('jewelsToRedeem');
  if (redeemInput && !redeemInput.value) {
    redeemInput.placeholder = 'Min ' + JEWELS_PER_CENT.toLocaleString() + ' jewels ($0.01)';
  }

  if (gameState.paypalEmail) {
    const emailInput = document.getElementById('paypalEmail');
    if (emailInput && !emailInput.value) emailInput.value = gameState.paypalEmail;
  }
}

function setCount(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val.toLocaleString();
}

// ── Countdown timer ───────────────────────────────────────────────────────────
function startCountdown() {
  clearInterval(countdownInterval);
  tickCountdown();
  countdownInterval = setInterval(tickCountdown, 1000);
}

function restartCountdown() {
  startCountdown();
}

function tickCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;

  let seconds = gameState.secondsUntilPayout || 0;
  if (seconds > 0) {
    seconds--;
    gameState.secondsUntilPayout = seconds;
    gameState.payoutReady = seconds === 0;
  }

  if (!gameState.secondsUntilPayout || gameState.secondsUntilPayout <= 0) {
    el.textContent = 'READY NOW!';
    el.classList.add('payout-ready');
    document.getElementById('cashoutBtn').disabled = false;
  } else {
    el.classList.remove('payout-ready');
    el.textContent = formatCountdown(gameState.secondsUntilPayout);
    document.getElementById('cashoutBtn').disabled = true;
  }
}

function formatCountdown(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return pad(h) + ':' + pad(m) + ':' + pad(s);
}

function pad(n) { return String(n).padStart(2, '0'); }

// ── Cashout ───────────────────────────────────────────────────────────────────
async function cashout() {
  const emailInput  = document.getElementById('paypalEmail');
  const redeemInput = document.getElementById('jewelsToRedeem');
  const msgEl       = document.getElementById('cashoutMsg');

  const email         = (emailInput.value  || '').trim();
  const jewelsToRedeem = parseInt(redeemInput.value, 10);

  clearMsg(msgEl);

  if (!isValidEmail(email)) {
    showMsg(msgEl, 'Enter a valid PayPal email address.', 'error');
    return;
  }

  if (!jewelsToRedeem || jewelsToRedeem < JEWELS_PER_CENT) {
    showMsg(msgEl, 'Minimum cashout is ' + JEWELS_PER_CENT.toLocaleString() + ' jewels ($0.01).', 'error');
    return;
  }

  if (jewelsToRedeem > gameState.totalJewels) {
    showMsg(msgEl, 'Not enough jewels. You have ' + gameState.totalJewels.toLocaleString() + '.', 'error');
    return;
  }

  if (!gameState.payoutReady) {
    showMsg(msgEl, 'Payout not ready yet. Wait for the countdown.', 'error');
    return;
  }

  const cashoutBtn = document.getElementById('cashoutBtn');
  cashoutBtn.disabled = true;
  cashoutBtn.textContent = 'PROCESSING…';

  try {
    // Save PayPal email first
    await apiFetch('/set-paypal', {
      method: 'POST',
      body: JSON.stringify({ paypalEmail: email })
    });

    // Request payout
    const res = await apiFetch('/payout', {
      method: 'POST',
      body: JSON.stringify({ jewelsToRedeem })
    });

    const data = await res.json();

    if (res.ok) {
      showMsg(msgEl, data.message || 'Payout sent! Check your PayPal.', 'success');
      // Reset 3-hr timer
      gameState.secondsUntilPayout = 3 * 60 * 60;
      gameState.payoutReady = false;
      redeemInput.value = '';
      fetchStatus();
    } else if (res.status === 429) {
      // Cooldown: parse seconds from server
      gameState.secondsUntilPayout = data.secondsUntilPayout || (3 * 60 * 60);
      gameState.payoutReady = false;
      restartCountdown();
      showMsg(msgEl, data.error || 'Payout cooldown active. Please wait.', 'error');
    } else {
      showMsg(msgEl, data.error || 'Payout failed. Please try again.', 'error');
    }
  } catch {
    showMsg(msgEl, 'Could not reach the server. Make sure the backend is running.', 'error');
  }

  cashoutBtn.textContent = 'CASH OUT';
  cashoutBtn.disabled = !gameState.payoutReady;
}

// ── API base override ─────────────────────────────────────────────────────────
function saveApiBase() {
  const val = (document.getElementById('apiBaseInput').value || '').trim();
  if (val) {
    localStorage.setItem(API_KEY, val);
    fetchStatus();
    showStatusMsg('spinMsg', 'API base updated. Reconnecting…', 'info');
  }
}

// ── Local storage persistence ─────────────────────────────────────────────────
function saveLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  } catch { /* storage full or blocked */ }
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      gameState = Object.assign(gameState, saved);
    }
  } catch { /* malformed data */ }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function isValidEmail(email) {
  if (typeof email !== 'string' || email.length > 254 || email.length < 3) return false;
  const at = email.indexOf('@');
  if (at < 1 || at === email.length - 1) return false;
  const domain = email.slice(at + 1);
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
}

function showMsg(el, text, type) {
  el.textContent  = text;
  el.className    = 'status-msg show ' + type;
}

function clearMsg(el) {
  el.textContent = '';
  el.className   = 'status-msg';
}

function showStatusMsg(id, text, type) {
  const el = document.getElementById(id);
  if (el) showMsg(el, text, type);
}
