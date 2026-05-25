import { PATTERN_POOL, COLOR_PALETTE } from './patterns.js';

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

// Generate `rounds` disjoint perfect matchings of `cells` (length must be even)
// using the round-robin circle method. Across the returned rounds, no cell-pair
// repeats — every cell is paired with a different partner each round.
function roundRobinMatchings(cells, rounds) {
  const n = cells.length;
  const rotating = cells.slice(1);
  const matchings = [];
  for (let r = 0; r < rounds; r++) {
    const ring = [cells[0], ...rotating];
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      pairs.push([ring[i], ring[n - 1 - i]]);
    }
    matchings.push(pairs);
    rotating.unshift(rotating.pop());
  }
  return matchings;
}

function newGame(layers) {
  const colors = pickRandom(COLOR_PALETTE, COLORS_PER_GAME);
  const patterns = pickRandom(PATTERN_POOL, PATTERNS_PER_GAME);
  const N = colors.length;
  const totalCells = ROWS * COLS;
  const cellsPerColor = totalCells / N;          // 48 / 6 = 8
  const patternsPerColor = cellsPerColor / 2;    // 4 patterns per (layer, colour)

  // Each cell gets a base colour index 0..N-1; layer L uses colour (base + L) mod N.
  // Because shifts are distinct mod N (with layers <= N), every cell ends up with
  // a unique colour on every layer.
  const flatBases = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < cellsPerColor; j++) flatBases.push(i);
  }
  shuffle(flatBases);

  const tiles = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => [])
  );

  // Group cell positions by base index for quick lookup.
  const cellsByBase = Array.from({ length: N }, () => []);
  {
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let cc = 0; cc < COLS; cc++) {
        cellsByBase[flatBases[idx++]].push([r, cc]);
      }
    }
  }

  // Per base group, pre-compute `layers` disjoint perfect matchings so that
  // no pair of tile positions ever forms a match on more than one layer.
  // (Pairs only ever form within a base group — same colour on a given layer
  // means same base — so global uniqueness reduces to per-group uniqueness.)
  const matchingsByBase = cellsByBase.map((cells) => {
    const shuffled = cells.slice();
    shuffle(shuffled);
    return roundRobinMatchings(shuffled, layers);
  });

  for (let layer = 0; layer < layers; layer++) {
    for (let baseIdx = 0; baseIdx < N; baseIdx++) {
      const color = colors[(baseIdx + layer) % N];
      const pairs = matchingsByBase[baseIdx][layer];
      const layerPatterns = pickRandom(patterns, patternsPerColor);
      for (let i = 0; i < pairs.length; i++) {
        const [[r1, c1], [r2, c2]] = pairs[i];
        const pid = layerPatterns[i].id;
        tiles[r1][c1].push({ color, patternId: pid });
        tiles[r2][c2].push({ color, patternId: pid });
      }
    }
  }

  state = {
    layers,
    colors,
    patterns,
    patternsById: Object.fromEntries(patterns.map((p) => [p.id, p])),
    tiles,
    selected: null,
    locked: false,
    cleared: 0,
    totalPairs: patternsPerColor * N * layers,   // 4 * 6 * layers = 24 * layers
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
  // Render every remaining layer in a single SVG, bottom-up, with transparent
  // group backgrounds so lower layers peek through the gaps of higher ones.
  const groups = layers.map((layer) => {
    const pat = state.patternsById[layer.patternId];
    return `<g>${pat.render(layer.color)}</g>`;
  }).join('');
  el.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${groups}</svg>`;
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
