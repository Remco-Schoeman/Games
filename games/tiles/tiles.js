import { PATTERN_POOL } from './patterns.js';

// --- Configuration ---
const ROWS = 8;
const COLS = 6;
const PATTERNS_PER_GAME = 20;
const COLORS_PER_GAME = 6;
const MISS_PENALTY_SECONDS = 5;
const SCORES_KEY = 'tiles.highscores.v1';
const NAME_KEY = 'pocketgames.playerName';
const LAYERS_KEY = 'tiles.layers';
const MAX_SCORES = 10;

const COLOR_PALETTE = [
  '#1976d2', // azure blue (classic azulejo)
  '#0d47a1', // deep blue
  '#00897b', // teal
  '#388e3c', // green
  '#fbc02d', // mustard
  '#f57c00', // amber
  '#d32f2f', // red
  '#7b1fa2', // purple
  '#5d4037', // sienna
  '#c2185b', // magenta
  '#455a64', // slate
  '#00838f', // cyan
];

// --- DOM ---
const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const timeEl = $('hud-time');
const pairsEl = $('hud-pairs');
const missEl = $('hud-miss');
const overlayStart = $('overlay-start');
const overlayWin = $('overlay-win');
const overlayHelp = $('overlay-help');

// --- Utilities ---
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom(source, count) {
  return shuffle(source.slice()).slice(0, count);
}

function fmtTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// --- Game state ---
let state = null;
let timerId = null;

function newGame(layers) {
  const colors = pickRandom(COLOR_PALETTE, COLORS_PER_GAME);
  const patterns = pickRandom(PATTERN_POOL, PATTERNS_PER_GAME);

  // Build a combo pool from the chosen colours x patterns.
  const allCombos = [];
  for (const color of colors) {
    for (const p of patterns) {
      allCombos.push({ color, patternId: p.id });
    }
  }

  // Tiles: a 2D grid; each cell is an array of layers (bottom -> top).
  const tiles = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => [])
  );

  const cellsPerLayer = ROWS * COLS;
  const pairsPerLayer = cellsPerLayer / 2;

  for (let layer = 0; layer < layers; layer++) {
    // Pick `pairsPerLayer` unique combos for this layer.
    const layerCombos = pickRandom(allCombos, pairsPerLayer);
    // Duplicate each so we have exact pairs.
    const layerTiles = [];
    for (const c of layerCombos) {
      layerTiles.push({ ...c });
      layerTiles.push({ ...c });
    }
    shuffle(layerTiles);
    // Distribute into cells.
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let cc = 0; cc < COLS; cc++) {
        tiles[r][cc].push(layerTiles[idx++]);
      }
    }
  }

  state = {
    layers,
    colors,
    patterns,
    patternsById: Object.fromEntries(patterns.map((p) => [p.id, p])),
    tiles,
    selected: null, // {r, c, el}
    locked: false,
    cleared: 0,
    totalPairs: pairsPerLayer * layers,
    misses: 0,
    startTime: Date.now(),
    finished: false,
  };
}

// --- Rendering ---
function renderBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let cc = 0; cc < COLS; cc++) {
      const el = document.createElement('div');
      el.className = 'tile';
      el.setAttribute('role', 'gridcell');
      el.dataset.r = r;
      el.dataset.c = cc;
      paintTile(el, r, cc);
      el.addEventListener('click', onTileClick);
      boardEl.appendChild(el);
    }
  }
}

function paintTile(el, r, c) {
  const layers = state.tiles[r][c];
  el.dataset.layers = layers.length;
  if (layers.length === 0) {
    el.classList.add('empty');
    el.innerHTML = '';
    el.setAttribute('aria-label', 'empty slot');
    return;
  }
  const top = layers[layers.length - 1];
  const pat = state.patternsById[top.patternId];
  el.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${pat.render(top.color)}</svg>`;
  el.setAttribute(
    'aria-label',
    `tile r${r + 1}c${c + 1}, ${layers.length} layer${layers.length === 1 ? '' : 's'}`
  );
}

function updateHud() {
  pairsEl.textContent = `${state.cleared} / ${state.totalPairs}`;
  missEl.textContent = state.misses;
}

function tickTimer() {
  if (!state || state.finished) return;
  const elapsed = Date.now() - state.startTime;
  timeEl.textContent = fmtTime(elapsed);
}

// --- Interaction ---
function onTileClick(e) {
  if (!state || state.finished || state.locked) return;
  const el = e.currentTarget;
  const r = +el.dataset.r;
  const c = +el.dataset.c;
  const layers = state.tiles[r][c];
  if (layers.length === 0) return;

  if (!state.selected) {
    state.selected = { r, c, el };
    el.classList.add('selected');
    return;
  }

  const sel = state.selected;
  if (sel.r === r && sel.c === c) {
    // tap again to deselect
    el.classList.remove('selected');
    state.selected = null;
    return;
  }

  const a = layers[layers.length - 1];
  const bLayers = state.tiles[sel.r][sel.c];
  const b = bLayers[bLayers.length - 1];

  if (a.color === b.color && a.patternId === b.patternId) {
    state.locked = true;
    // Pop top layer from both.
    el.classList.add('match');
    sel.el.classList.add('match');
    sel.el.classList.remove('selected');
    layers.pop();
    bLayers.pop();
    state.cleared += 1;

    setTimeout(() => {
      el.classList.remove('match');
      sel.el.classList.remove('match');
      paintTile(el, r, c);
      paintTile(sel.el, sel.r, sel.c);
      state.selected = null;
      state.locked = false;
      updateHud();
      if (state.cleared >= state.totalPairs) {
        endGame();
      }
    }, 280);
  } else {
    // Mismatch
    state.misses += 1;
    state.locked = true;
    el.classList.add('miss');
    sel.el.classList.add('miss');
    sel.el.classList.remove('selected');
    updateHud();
    setTimeout(() => {
      el.classList.remove('miss');
      sel.el.classList.remove('miss');
      state.selected = null;
      state.locked = false;
    }, 320);
  }
}

// --- End game / score ---
function computeScore(elapsedMs, misses) {
  return Math.round(elapsedMs / 1000) + misses * MISS_PENALTY_SECONDS;
}

function endGame() {
  state.finished = true;
  clearInterval(timerId);
  const elapsedMs = Date.now() - state.startTime;
  const score = computeScore(elapsedMs, state.misses);
  const name = (localStorage.getItem(NAME_KEY) || 'Anonymous').trim() || 'Anonymous';
  const entry = {
    name,
    score,
    timeMs: elapsedMs,
    misses: state.misses,
    layers: state.layers,
    at: Date.now(),
  };
  const justSavedIndex = saveScore(entry);

  $('win-summary').textContent =
    `${fmtTime(elapsedMs)} · ${state.misses} miss${state.misses === 1 ? '' : 'es'} · ${state.layers} layers`;
  $('win-score').textContent = score;
  renderScoresInto($('win-scores-list'), justSavedIndex);
  overlayWin.classList.remove('hidden');
}

// --- High scores ---
function loadScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveScore(entry) {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => a.score - b.score);
  const trimmed = scores.slice(0, MAX_SCORES);
  localStorage.setItem(SCORES_KEY, JSON.stringify(trimmed));
  return trimmed.indexOf(entry);
}

function renderScoresInto(listEl, highlightIndex = -1) {
  const scores = loadScores();
  listEl.innerHTML = '';
  if (scores.length === 0) {
    listEl.classList.add('empty');
    return;
  }
  listEl.classList.remove('empty');
  scores.forEach((s, i) => {
    const li = document.createElement('li');
    if (i === highlightIndex) li.classList.add('me');
    const safeName = (s.name || 'Anonymous').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    li.innerHTML = `<strong>${s.score}</strong> &nbsp; ${safeName} · ${fmtTime(s.timeMs)} · ${s.misses} miss · L${s.layers}`;
    listEl.appendChild(li);
  });
}

// --- Boot / overlays ---
function startGame() {
  const layers = parseInt($('start-layers').value, 10) || 3;
  localStorage.setItem(LAYERS_KEY, String(layers));
  const name = $('start-name').value.trim();
  if (name) localStorage.setItem(NAME_KEY, name);

  newGame(layers);
  renderBoard();
  updateHud();
  timeEl.textContent = '0:00';
  clearInterval(timerId);
  timerId = setInterval(tickTimer, 200);

  overlayStart.classList.add('hidden');
  overlayWin.classList.add('hidden');
}

function restartFromInGame() {
  if (!state) return;
  if (!state.finished && state.cleared > 0) {
    if (!confirm('Restart the current game? Progress will be lost.')) return;
  }
  clearInterval(timerId);
  state = null;
  overlayWin.classList.add('hidden');
  overlayStart.classList.remove('hidden');
  populateStartOverlay();
}

function populateStartOverlay() {
  $('start-name').value = localStorage.getItem(NAME_KEY) || '';
  const savedLayers = localStorage.getItem(LAYERS_KEY);
  if (savedLayers && ['2', '3', '4'].includes(savedLayers)) {
    $('start-layers').value = savedLayers;
  }
  renderScoresInto($('scores-list'));
}

function wireEvents() {
  $('btn-start').addEventListener('click', startGame);
  $('btn-restart').addEventListener('click', restartFromInGame);
  $('btn-again').addEventListener('click', () => {
    overlayWin.classList.add('hidden');
    overlayStart.classList.remove('hidden');
    populateStartOverlay();
  });
  $('btn-home').addEventListener('click', () => {
    window.location.href = '../../';
  });
  $('btn-help').addEventListener('click', () => overlayHelp.classList.remove('hidden'));
  $('btn-help-close').addEventListener('click', () => overlayHelp.classList.add('hidden'));

  $('start-name').addEventListener('change', (e) => {
    localStorage.setItem(NAME_KEY, e.target.value.trim());
  });

  // Submit start with Enter from name input
  $('start-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame();
  });
}

// --- Init ---
wireEvents();
populateStartOverlay();
