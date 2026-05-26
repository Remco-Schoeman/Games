// Pour the Perfect Pint — a two-part-pour timing minigame.

const NAME_KEY = 'pocketgames.playerName';
const BEST_KEY = 'pint.best.v1';
const MAX_BEST = 10;

// Tuning -------------------------------------------------------------------
const TARGET_1 = 75;       // ideal fill % after the first pour (harp line)
const TARGET_2 = 100;      // ideal final fill %
const POUR_RATE = 42;      // % filled per second while holding
const SETTLE_MS = 5000;    // settle animation duration
const SETTLE_MIN_MS = 3500;// must wait this long before tapping again
const OVERFLOW_PENALTY = 6;// score lost per percent over 100

// SVG y-coordinates inside the glass clip path -----------------------------
// Glass interior spans roughly y=18 (rim) to y=338 (bottom).
const GLASS_TOP = 22;
const GLASS_BOTTOM = 334;
const GLASS_HEIGHT = GLASS_BOTTOM - GLASS_TOP;
function fillToY(percent) {
  return GLASS_BOTTOM - (percent / 100) * GLASS_HEIGHT;
}

// DOM --------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const stoutLayer = $('stout-layer');
const headLayer = $('head-layer');
const surgeLayer = $('surge-layer');
const pourBtn = $('pour-btn');
const pourLabel = pourBtn.querySelector('.pour-btn-label');
const messageEl = $('message');
const stageEl = $('hud-stage');
const fillEl = $('hud-fill');
const bestEl = $('hud-best');
const overlayDone = $('overlay-done');
const overlayHelp = $('overlay-help');

// State ------------------------------------------------------------------
let state = null;

function newRound() {
  state = {
    phase: 'idle',          // idle | pouring1 | settling | ready2 | pouring2 | done
    fill: 0,                // 0..120 (over 100 = overflow)
    holding: false,
    pour1Stop: null,
    pour2Stop: null,
    settleStart: null,
    settleProgress: 0,      // 0..1 during settle (1 = fully settled)
    lastTick: null,
  };
  renderGlass();
  setMessage('Hold the pour to begin.', '');
  setStage('Ready');
  pourLabel.textContent = 'Hold to pour';
  pourBtn.disabled = false;
  overlayDone.classList.add('hidden');
}

function setMessage(text, kind = '') {
  messageEl.textContent = text;
  messageEl.className = 'pint-message' + (kind ? ' ' + kind : '');
}
function setStage(text) { stageEl.textContent = text; }
function setFill(pct) { fillEl.textContent = `${Math.round(pct)}%`; }

function renderGlass() {
  // Stout body: dark beer from bottom up to (fill - headHeight)
  const fill = Math.min(state.fill, 120);
  const headHeight = headHeightForState();
  const stoutTopPct = Math.max(0, fill - headHeight);

  const stoutTopY = fillToY(stoutTopPct);
  const stoutBottomY = GLASS_BOTTOM;
  stoutLayer.setAttribute('y', stoutTopY);
  stoutLayer.setAttribute('height', Math.max(0, stoutBottomY - stoutTopY));

  const headTopY = fillToY(fill);
  headLayer.setAttribute('y', headTopY);
  headLayer.setAttribute('height', Math.max(0, stoutTopY - headTopY));

  // The surge layer covers the whole liquid column while pouring, fading out as it settles.
  const isPouring = state.phase === 'pouring1' || state.phase === 'pouring2';
  const showSurge = isPouring ? 0.85 : Math.max(0, 0.75 * (1 - state.settleProgress));
  surgeLayer.setAttribute('y', fillToY(fill));
  surgeLayer.setAttribute('height', Math.max(0, GLASS_BOTTOM - fillToY(fill)));
  surgeLayer.setAttribute('opacity', showSurge.toFixed(2));
}

function headHeightForState() {
  // While pouring, the entire column is "agitated" — no separated head yet.
  // After settle, a creamy head of ~12% of glass sits on top of the stout.
  if (state.phase === 'pouring1' || state.phase === 'pouring2') return 0;
  if (state.phase === 'settling') return 12 * state.settleProgress;
  if (state.phase === 'ready2' || state.phase === 'done') return 12;
  return 0;
}

// Game loop ---------------------------------------------------------------
function tick(now) {
  if (!state) return;
  if (state.lastTick == null) state.lastTick = now;
  const dt = (now - state.lastTick) / 1000;
  state.lastTick = now;

  if ((state.phase === 'pouring1' || state.phase === 'pouring2') && state.holding) {
    state.fill = Math.min(state.fill + POUR_RATE * dt, 120);
  }

  if (state.phase === 'settling') {
    const elapsed = now - state.settleStart;
    state.settleProgress = Math.min(1, elapsed / SETTLE_MS);
    if (state.settleProgress >= 1) {
      state.phase = 'ready2';
      pourBtn.disabled = false;
      pourLabel.textContent = 'Hold to top off';
      setStage('Top it off');
      setMessage('Perfect head. Top it off without overflowing.', 'good');
    }
  }

  setFill(state.fill);
  renderGlass();
  requestAnimationFrame(tick);
}

// Pour controls -----------------------------------------------------------
function startHold() {
  if (!state) return;
  if (state.phase === 'idle') {
    state.phase = 'pouring1';
    state.holding = true;
    state.lastTick = null;
    setStage('Pour 1');
    setMessage('Pour to the harp etched on the glass.');
    pourBtn.classList.add('pressing');
    requestAnimationFrame(tick);
    return;
  }
  if (state.phase === 'ready2') {
    state.phase = 'pouring2';
    state.holding = true;
    state.lastTick = null;
    setStage('Pour 2');
    setMessage('Stop the moment it domes over the rim.');
    pourBtn.classList.add('pressing');
    requestAnimationFrame(tick);
    return;
  }
}

function endHold() {
  if (!state || !state.holding) return;
  state.holding = false;
  pourBtn.classList.remove('pressing');

  if (state.phase === 'pouring1') {
    state.pour1Stop = state.fill;
    state.phase = 'settling';
    state.settleStart = performance.now();
    state.settleProgress = 0;
    pourBtn.disabled = true;
    pourLabel.textContent = 'Settling…';
    setStage('Settle');
    setMessage('Let the surge settle. Do not touch it.', 'warn');
    // Allow tapping again after SETTLE_MIN_MS even if animation isn't complete.
    setTimeout(() => {
      if (state && state.phase === 'settling') {
        pourBtn.disabled = false;
        pourLabel.textContent = 'Hold to top off';
      }
    }, SETTLE_MIN_MS);
    return;
  }

  if (state.phase === 'pouring2') {
    state.pour2Stop = state.fill;
    finishRound();
  }
}

function finishRound() {
  state.phase = 'done';
  pourBtn.disabled = true;
  pourLabel.textContent = 'Done';
  setStage('Done');

  const score = computeScore(state);
  saveBest(score);
  renderDone(score);
}

function computeScore({ pour1Stop, pour2Stop, settleProgress }) {
  // Phase 1: closer to 75% is better. 2-point falloff per percent off.
  const p1 = Math.max(0, 100 - Math.abs(pour1Stop - TARGET_1) * 2);
  // Phase 2: aiming for ~100. Stiff overflow penalty.
  let p2;
  if (pour2Stop <= 100) {
    p2 = Math.max(0, 100 - Math.abs(pour2Stop - TARGET_2) * 2);
  } else {
    p2 = Math.max(0, 100 - (pour2Stop - 100) * OVERFLOW_PENALTY);
  }
  const settleBonus = Math.round(10 * settleProgress); // up to +10 for full settle
  const base = (p1 + p2) / 2;
  return Math.max(0, Math.min(100, Math.round(base + settleBonus - 5))); // -5 baseline so 100 means perfect+wait
}

// Best-scores -------------------------------------------------------------
function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveBest(score) {
  const name = (localStorage.getItem(NAME_KEY) || 'Anonymous').trim() || 'Anonymous';
  const entry = { name, score, at: Date.now() };
  const list = loadBest();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, MAX_BEST);
  localStorage.setItem(BEST_KEY, JSON.stringify(trimmed));
  bestEl.textContent = trimmed[0]?.score ?? 0;
  return trimmed.indexOf(entry);
}

function refreshBestHud() {
  const list = loadBest();
  bestEl.textContent = list[0]?.score ?? 0;
}

function renderDone(score) {
  $('done-score').textContent = score;
  const p1 = Math.round(state.pour1Stop);
  const p2 = Math.round(state.pour2Stop);
  const overflow = p2 > 100 ? ` · overflow ${p2 - 100}%` : '';
  $('done-summary').textContent =
    `First pour ${p1}% · settle ${Math.round(state.settleProgress * 100)}% · final ${Math.min(p2,100)}%${overflow}`;
  const listEl = $('best-list');
  const list = loadBest();
  listEl.innerHTML = '';
  if (list.length === 0) listEl.classList.add('empty');
  else listEl.classList.remove('empty');
  const myIdx = list.findIndex((e) => e.score === score && e.at === list[0]?.at) === 0 ? 0 : -1;
  list.forEach((s, i) => {
    const li = document.createElement('li');
    if (i === 0 && s.score === score) li.classList.add('me');
    const safe = (s.name || 'Anonymous').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    li.innerHTML = `<strong>${s.score}</strong> &nbsp; ${safe}`;
    listEl.appendChild(li);
  });
  overlayDone.classList.remove('hidden');
}

// Wire up -----------------------------------------------------------------
function bindPointer(el) {
  const start = (e) => { e.preventDefault(); if (!pourBtn.disabled) startHold(); };
  const end = (e) => { e.preventDefault(); endHold(); };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', (e) => { if (state?.holding) end(e); });
}

bindPointer(pourBtn);

$('btn-restart').addEventListener('click', () => {
  if (state && (state.phase === 'pouring1' || state.phase === 'pouring2')) endHold();
  newRound();
});

$('btn-again').addEventListener('click', newRound);
$('btn-home').addEventListener('click', () => { window.location.href = '../../'; });
$('btn-help').addEventListener('click', () => overlayHelp.classList.remove('hidden'));
$('btn-help-close').addEventListener('click', () => overlayHelp.classList.add('hidden'));

refreshBestHud();
newRound();
