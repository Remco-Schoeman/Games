// Brick Builder — top-down LEGO baseplate / tangram-style puzzle. Each level
// gives you a target silhouette and a set of pre-oriented bricks. Tap a brick
// in the palette, then tap the plate to place it (anchored at its top-left).
// No rotation; bricks come in the orientation they're meant to be placed.

const PROGRESS_KEY = 'lego.progress.v1';

// --- Brick shapes -------------------------------------------------------
// Each shape is an array of [dRow, dCol] offsets from the anchor cell.
const SHAPES = {
  '1x1':  [[0,0]],
  '1x2H': [[0,0],[0,1]],
  '1x2V': [[0,0],[1,0]],
  '1x3H': [[0,0],[0,1],[0,2]],
  '1x3V': [[0,0],[1,0],[2,0]],
  '1x4H': [[0,0],[0,1],[0,2],[0,3]],
  '1x4V': [[0,0],[1,0],[2,0],[3,0]],
  '2x2':  [[0,0],[0,1],[1,0],[1,1]],
  '2x3H': [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]],
  '2x3V': [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]],
};

// Lego-ish colours.
const RED    = '#d32f2f';
const YELLOW = '#fbc02d';
const BLUE   = '#1976d2';
const WHITE  = '#f5f5f5';
const BLACK  = '#212121';
const GREEN  = '#388e3c';
const BROWN  = '#6d4c41';
const ORANGE = '#fb8c00';

// --- Levels --------------------------------------------------------------
const LEVELS = [
  {
    name: 'House',
    rows: 3,
    cols: 4,
    silhouette: [
      [0,1,1,0],
      [1,1,1,1],
      [1,1,1,1],
    ],
    bricks: [
      { shape: '1x2H', color: RED },
      { shape: '1x4H', color: YELLOW },
      { shape: '1x4H', color: BLUE },
    ],
  },
  {
    name: 'Sailboat',
    rows: 4,
    cols: 4,
    silhouette: [
      [0,0,1,0],
      [0,0,1,0],
      [1,1,1,1],
      [0,1,1,0],
    ],
    bricks: [
      { shape: '1x2V', color: WHITE },   // mast
      { shape: '1x4H', color: RED },     // hull
      { shape: '1x2H', color: BROWN },   // keel
    ],
  },
  {
    name: 'Tree',
    rows: 4,
    cols: 4,
    silhouette: [
      [1,1,1,1],
      [0,1,1,0],
      [0,1,1,0],
      [0,1,1,0],
    ],
    bricks: [
      { shape: '1x4H', color: GREEN },
      { shape: '2x2',  color: BROWN },
      { shape: '1x2H', color: BROWN },
    ],
  },
  {
    name: 'Minifig',
    rows: 5,
    cols: 4,
    silhouette: [
      [0,1,1,0],
      [1,1,1,1],
      [0,1,1,0],
      [1,0,0,1],
      [1,0,0,1],
    ],
    bricks: [
      { shape: '1x2H', color: YELLOW }, // head
      { shape: '1x4H', color: BLUE },   // shoulders
      { shape: '1x2H', color: BLUE },   // waist
      { shape: '1x2V', color: BLACK },  // left leg
      { shape: '1x2V', color: BLACK },  // right leg
    ],
  },
  {
    name: 'Fish',
    rows: 3,
    cols: 6,
    silhouette: [
      [0,1,1,1,1,0],
      [1,1,1,1,1,1],
      [0,1,1,1,1,0],
    ],
    bricks: [
      { shape: '1x4H', color: ORANGE },
      { shape: '1x4H', color: ORANGE },
      { shape: '1x2H', color: ORANGE },
      { shape: '1x2H', color: ORANGE },
      { shape: '1x2H', color: ORANGE },
    ],
  },
];

// --- Visual constants ----------------------------------------------------
const CELL = 48;
const STUD_R = 8;
const PAD = 16;
const PLATE_COLOUR = '#7cb342';
const PLATE_STUD = '#6a9c36';
const SILHOUETTE_COLOUR = '#f7e7c2';
const SILHOUETTE_STUD = '#d6c08a';

// --- DOM ----------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const paletteEl = $('palette');
const messageEl = $('message');
const overlayWin = $('overlay-win');
const overlayHelp = $('overlay-help');

// --- State --------------------------------------------------------------
let state = null;

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { current: 0, solved: [] };
    const obj = JSON.parse(raw);
    return {
      current: typeof obj.current === 'number' ? obj.current : 0,
      solved: Array.isArray(obj.solved) ? obj.solved : [],
    };
  } catch { return { current: 0, solved: [] }; }
}
function saveProgress(p) { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); }

function newLevel(idx) {
  const lvl = LEVELS[idx];
  state = {
    idx,
    rows: lvl.rows,
    cols: lvl.cols,
    silhouette: lvl.silhouette,
    bricks: lvl.bricks.map((b, i) => ({
      ...b,
      cells: SHAPES[b.shape],
      placed: false,
      anchor: null, // [r, c]
      id: i,
    })),
    selected: null,
    won: false,
  };
  $('hud-level').textContent = `${idx + 1}/${LEVELS.length}`;
  $('hud-name').textContent = lvl.name;
  $('level-name').textContent = lvl.name;
  $('btn-prev').disabled = idx === 0;
  $('btn-next').disabled = idx === LEVELS.length - 1;
  setMessage('Tap a brick, then tap the plate to place it.', '');
  renderBoard();
  renderPalette();
  updateHud();
  overlayWin.classList.add('hidden');
}

function updateHud() {
  const placed = state.bricks.filter((b) => b.placed).length;
  $('hud-bricks').textContent = `${placed}/${state.bricks.length}`;
}

function setMessage(text, kind = '') {
  messageEl.textContent = text;
  messageEl.className = 'lego-message' + (kind ? ' ' + kind : '');
}

// --- Geometry helpers ---------------------------------------------------
function brickCellsAt(brick, r, c) {
  return brick.cells.map(([dr, dc]) => [r + dr, c + dc]);
}

function inSilhouette(r, c) {
  return r >= 0 && r < state.rows && c >= 0 && c < state.cols && state.silhouette[r][c] === 1;
}

function cellOccupiedBy(r, c) {
  for (const b of state.bricks) {
    if (!b.placed) continue;
    const cells = brickCellsAt(b, b.anchor[0], b.anchor[1]);
    if (cells.some(([rr, cc]) => rr === r && cc === c)) return b;
  }
  return null;
}

function canPlace(brick, r, c) {
  const cells = brickCellsAt(brick, r, c);
  for (const [rr, cc] of cells) {
    if (!inSilhouette(rr, cc)) return { ok: false, reason: 'Bricks must stay inside the cream shape.' };
    if (cellOccupiedBy(rr, cc))  return { ok: false, reason: 'Another brick is already there.' };
  }
  return { ok: true };
}

// --- Rendering ----------------------------------------------------------
function renderBoard() {
  const w = state.cols * CELL + PAD * 2;
  const h = state.rows * CELL + PAD * 2;
  boardEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
  boardEl.setAttribute('width', w);
  boardEl.setAttribute('height', h);
  boardEl.innerHTML = '';

  const ns = 'http://www.w3.org/2000/svg';

  // Plate base — green with subtle rounded corners.
  const plate = document.createElementNS(ns, 'rect');
  plate.setAttribute('x', 4);
  plate.setAttribute('y', 4);
  plate.setAttribute('width', w - 8);
  plate.setAttribute('height', h - 8);
  plate.setAttribute('rx', 8);
  plate.setAttribute('fill', PLATE_COLOUR);
  boardEl.appendChild(plate);

  // Silhouette: contiguous fill of in-shape cells (no per-cell borders).
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.silhouette[r][c]) {
        const cell = document.createElementNS(ns, 'rect');
        cell.setAttribute('x', PAD + c * CELL);
        cell.setAttribute('y', PAD + r * CELL);
        cell.setAttribute('width', CELL);
        cell.setAttribute('height', CELL);
        cell.setAttribute('fill', SILHOUETTE_COLOUR);
        boardEl.appendChild(cell);
      }
    }
  }

  // Studs (on the bare plate cells AND on silhouette cells; bricks will
  // later cover the silhouette ones).
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const onSil = state.silhouette[r][c];
      const stud = document.createElementNS(ns, 'circle');
      stud.setAttribute('cx', PAD + c * CELL + CELL / 2);
      stud.setAttribute('cy', PAD + r * CELL + CELL / 2);
      stud.setAttribute('r', STUD_R);
      stud.setAttribute('fill', onSil ? SILHOUETTE_STUD : PLATE_STUD);
      boardEl.appendChild(stud);
    }
  }

  // Tap targets for cells (used to place a selected brick).
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const hit = document.createElementNS(ns, 'rect');
      hit.setAttribute('x', PAD + c * CELL);
      hit.setAttribute('y', PAD + r * CELL);
      hit.setAttribute('width', CELL);
      hit.setAttribute('height', CELL);
      hit.setAttribute('fill', 'transparent');
      hit.setAttribute('class', 'cell-hit');
      hit.addEventListener('click', () => onCellTap(r, c));
      boardEl.appendChild(hit);
    }
  }

  // Placed bricks on top.
  for (const b of state.bricks) {
    if (!b.placed) continue;
    drawBrickOnBoard(b);
  }
}

function drawBrickOnBoard(brick) {
  const [r, c] = brick.anchor;
  const cells = brickCellsAt(brick, r, c);
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'placed-brick');
  g.style.cursor = 'pointer';

  // Compute bounding box of cells.
  const minR = Math.min(...cells.map(([rr]) => rr));
  const maxR = Math.max(...cells.map(([rr]) => rr));
  const minC = Math.min(...cells.map(([, cc]) => cc));
  const maxC = Math.max(...cells.map(([, cc]) => cc));

  const inset = 3;
  for (let rr = minR; rr <= maxR; rr++) {
    for (let cc = minC; cc <= maxC; cc++) {
      // Only fill cells that are actually part of this brick (handles L/T shapes).
      if (!cells.some(([a, b]) => a === rr && b === cc)) continue;
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', PAD + cc * CELL + inset);
      rect.setAttribute('y', PAD + rr * CELL + inset);
      rect.setAttribute('width', CELL - inset * 2);
      rect.setAttribute('height', CELL - inset * 2);
      rect.setAttribute('rx', 3);
      rect.setAttribute('fill', brick.color);
      rect.setAttribute('stroke', 'rgba(0,0,0,0.25)');
      rect.setAttribute('stroke-width', 1);
      g.appendChild(rect);
    }
  }

  // Studs on top of the brick.
  for (const [rr, cc] of cells) {
    const stud = document.createElementNS(ns, 'circle');
    stud.setAttribute('cx', PAD + cc * CELL + CELL / 2);
    stud.setAttribute('cy', PAD + rr * CELL + CELL / 2);
    stud.setAttribute('r', STUD_R);
    stud.setAttribute('fill', brick.color);
    stud.setAttribute('stroke', 'rgba(0,0,0,0.3)');
    stud.setAttribute('stroke-width', 0.8);
    g.appendChild(stud);
    // Inner highlight on the stud for a slight 3D feel.
    const hi = document.createElementNS(ns, 'circle');
    hi.setAttribute('cx', PAD + cc * CELL + CELL / 2 - 1.5);
    hi.setAttribute('cy', PAD + rr * CELL + CELL / 2 - 1.5);
    hi.setAttribute('r', STUD_R * 0.55);
    hi.setAttribute('fill', 'rgba(255,255,255,0.22)');
    g.appendChild(hi);
  }

  g.addEventListener('click', (e) => {
    e.stopPropagation();
    unplaceBrick(brick);
  });
  boardEl.appendChild(g);
}

function renderPalette() {
  paletteEl.innerHTML = '';
  state.bricks.forEach((brick) => {
    if (brick.placed) return;
    const cells = brick.cells;
    const rows = Math.max(...cells.map(([r]) => r)) + 1;
    const cols = Math.max(...cells.map(([, c]) => c)) + 1;
    const mini = 22;
    const studR = 4;
    const w = cols * mini + 8;
    const h = rows * mini + 8;
    const wrap = document.createElement('div');
    wrap.className = 'palette-brick' + (state.selected === brick.id ? ' selected' : '');
    wrap.setAttribute('role', 'button');
    let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
    // body cells
    for (const [r, c] of cells) {
      svg += `<rect x="${4 + c * mini}" y="${4 + r * mini}" width="${mini}" height="${mini}" fill="${brick.color}" stroke="rgba(0,0,0,0.3)" stroke-width="1" rx="2"/>`;
    }
    // studs
    for (const [r, c] of cells) {
      svg += `<circle cx="${4 + c * mini + mini / 2}" cy="${4 + r * mini + mini / 2}" r="${studR}" fill="${brick.color}" stroke="rgba(0,0,0,0.35)" stroke-width="0.6"/>`;
      svg += `<circle cx="${4 + c * mini + mini / 2 - 1}" cy="${4 + r * mini + mini / 2 - 1}" r="${studR * 0.55}" fill="rgba(255,255,255,0.28)"/>`;
    }
    svg += `</svg>`;
    wrap.innerHTML = svg;
    wrap.addEventListener('click', () => selectBrick(brick.id));
    paletteEl.appendChild(wrap);
  });
  if (paletteEl.children.length === 0) {
    paletteEl.innerHTML = '<div style="color:#8aa0ba;font-size:13px;">All bricks placed.</div>';
  }
}

// --- Interaction --------------------------------------------------------
function selectBrick(id) {
  if (state.won) return;
  state.selected = state.selected === id ? null : id;
  renderPalette();
  setMessage(state.selected != null ? 'Tap the plate to place this brick.' : 'Tap a brick, then tap the plate to place it.');
}

function onCellTap(r, c) {
  if (state.won) return;
  if (state.selected == null) {
    setMessage('Pick a brick from the palette first.', 'warn');
    return;
  }
  const brick = state.bricks[state.selected];
  const res = canPlace(brick, r, c);
  if (!res.ok) {
    setMessage(res.reason, 'bad');
    return;
  }
  brick.placed = true;
  brick.anchor = [r, c];
  state.selected = null;
  renderBoard();
  renderPalette();
  updateHud();
  setMessage('', '');
  if (checkWin()) onWin();
}

function unplaceBrick(brick) {
  if (state.won) return;
  brick.placed = false;
  brick.anchor = null;
  renderBoard();
  renderPalette();
  updateHud();
}

function checkWin() {
  return state.bricks.every((b) => b.placed);
}

function onWin() {
  state.won = true;
  setMessage('All bricks placed.', 'good');
  const progress = loadProgress();
  if (!progress.solved.includes(state.idx)) progress.solved.push(state.idx);
  saveProgress(progress);
  $('win-summary').textContent =
    `${LEVELS[state.idx].name} · ${state.bricks.length} bricks · ${progress.solved.length}/${LEVELS.length} levels solved`;
  $('btn-next-level').style.display = state.idx === LEVELS.length - 1 ? 'none' : '';
  overlayWin.classList.remove('hidden');
}

// --- Wire up -----------------------------------------------------------
$('btn-restart').addEventListener('click', () => newLevel(state.idx));
$('btn-prev').addEventListener('click', () => {
  if (state.idx > 0) gotoLevel(state.idx - 1);
});
$('btn-next').addEventListener('click', () => {
  if (state.idx < LEVELS.length - 1) gotoLevel(state.idx + 1);
});
$('btn-next-level').addEventListener('click', () => {
  if (state.idx < LEVELS.length - 1) gotoLevel(state.idx + 1);
  else overlayWin.classList.add('hidden');
});
$('btn-replay').addEventListener('click', () => newLevel(state.idx));
$('btn-home').addEventListener('click', () => { window.location.href = '../../'; });
$('btn-help').addEventListener('click', () => overlayHelp.classList.remove('hidden'));
$('btn-help-close').addEventListener('click', () => overlayHelp.classList.add('hidden'));

function gotoLevel(idx) {
  const p = loadProgress();
  p.current = idx;
  saveProgress(p);
  newLevel(idx);
}

const progress = loadProgress();
const startIdx = Math.min(Math.max(progress.current || 0, 0), LEVELS.length - 1);
newLevel(startIdx);
