// Celtic Knot — a Slitherlink-style puzzle. Toggle edges between dots so the
// numbered cells get the right number of perimeter edges in the loop and the
// whole selection forms a single closed loop (every dot used 0 or 2 times,
// all edges in one connected component).

const PROGRESS_KEY = 'knot.progress.v1';

// --- Puzzles -----------------------------------------------------------
// `clues` is rows x cols, each cell is 0..3 or null (no constraint).
const PUZZLES = [
  {
    name: 'First knot',
    clues: [
      [0, 1, 0],
      [1, 4, 1],
      [0, 1, 0],
    ],
  },
  {
    name: 'Square within',
    clues: [
      [0,    1,    1,    0],
      [1,    2,    2,    1],
      [1,    2,    2,    1],
      [0,    1,    1,    0],
    ],
  },
  {
    name: 'The bent ribbon',
    clues: [
      [3,    1,    0,    0],
      [2,    2,    1,    0],
      [2,    2,    3,    1],
      [1,    1,    1,    0],
    ],
  },
  {
    name: 'The keep',
    clues: [
      [0, 1, 1, 1, 0],
      [1, 2, 1, 2, 1],
      [1, 1, 0, 1, 1],
      [1, 2, 1, 2, 1],
      [0, 1, 1, 1, 0],
    ],
  },
];

// --- DOM ---------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const messageEl = $('message');
const edgesHud = $('hud-edges');
const puzzleHud = $('hud-puzzle');
const overlayWin = $('overlay-win');
const overlayHelp = $('overlay-help');

// --- State -------------------------------------------------------------
let state = null;
const CELL = 60;          // logical pixels per cell in the viewBox
const PAD = 30;           // padding around the grid
const HIT_WIDTH = 26;     // touch target for edges (perpendicular thickness)

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { solved: [], current: 0 };
    const obj = JSON.parse(raw);
    return {
      solved: Array.isArray(obj.solved) ? obj.solved : [],
      current: typeof obj.current === 'number' ? obj.current : 0,
    };
  } catch { return { solved: [], current: 0 }; }
}
function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function newPuzzle(idx) {
  const p = PUZZLES[idx];
  const rows = p.clues.length;
  const cols = p.clues[0].length;
  state = {
    idx,
    rows,
    cols,
    clues: p.clues,
    // edge sets keyed by `${type}:${r}:${c}`. h=horizontal, v=vertical.
    on: new Set(),
    won: false,
  };
  buildBoard();
  setMessage('');
  updateHud();
  $('btn-prev').disabled = idx === 0;
  $('btn-next').disabled = idx === PUZZLES.length - 1;
}

function key(type, r, c) { return `${type}:${r}:${c}`; }

function edgeOn(type, r, c) { return state.on.has(key(type, r, c)); }
function toggleEdge(type, r, c) {
  if (state.won) return;
  const k = key(type, r, c);
  if (state.on.has(k)) state.on.delete(k);
  else state.on.add(k);
  updateEdgeVisual(type, r, c);
  updateHud();
  setMessage('');
}

function updateHud() {
  edgesHud.textContent = state.on.size;
  puzzleHud.textContent = `${state.idx + 1}/${PUZZLES.length}`;
}

function setMessage(text, kind = '') {
  messageEl.textContent = text || PUZZLES[state.idx].name;
  messageEl.className = 'knot-message' + (kind ? ' ' + kind : '');
}

// --- Rendering ---------------------------------------------------------
function buildBoard() {
  const w = state.cols * CELL + PAD * 2;
  const h = state.rows * CELL + PAD * 2;
  boardEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
  boardEl.setAttribute('width', w);
  boardEl.setAttribute('height', h);
  boardEl.innerHTML = '';

  const ns = 'http://www.w3.org/2000/svg';

  // Edges (visible band underneath, hit area on top)
  for (let r = 0; r <= state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const x1 = PAD + c * CELL;
      const y1 = PAD + r * CELL;
      const x2 = x1 + CELL;
      const y2 = y1;
      addEdge('h', r, c, x1, y1, x2, y2);
    }
  }
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c <= state.cols; c++) {
      const x1 = PAD + c * CELL;
      const y1 = PAD + r * CELL;
      const x2 = x1;
      const y2 = y1 + CELL;
      addEdge('v', r, c, x1, y1, x2, y2);
    }
  }

  // Clues in cell centres
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const v = state.clues[r][c];
      if (v == null) continue;
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('class', 'clue');
      t.setAttribute('x', PAD + c * CELL + CELL / 2);
      t.setAttribute('y', PAD + r * CELL + CELL / 2 + 1);
      t.textContent = v;
      boardEl.appendChild(t);
    }
  }

  // Dots at grid intersections
  for (let r = 0; r <= state.rows; r++) {
    for (let c = 0; c <= state.cols; c++) {
      const d = document.createElementNS(ns, 'circle');
      d.setAttribute('class', 'dot');
      d.setAttribute('cx', PAD + c * CELL);
      d.setAttribute('cy', PAD + r * CELL);
      d.setAttribute('r', 4);
      boardEl.appendChild(d);
    }
  }
}

function addEdge(type, r, c, x1, y1, x2, y2) {
  const ns = 'http://www.w3.org/2000/svg';
  const visible = document.createElementNS(ns, 'line');
  visible.setAttribute('class', 'edge');
  visible.setAttribute('data-edge', key(type, r, c));
  visible.setAttribute('x1', x1);
  visible.setAttribute('y1', y1);
  visible.setAttribute('x2', x2);
  visible.setAttribute('y2', y2);
  boardEl.appendChild(visible);

  const hit = document.createElementNS(ns, 'line');
  hit.setAttribute('class', 'edge-hit');
  hit.setAttribute('x1', x1);
  hit.setAttribute('y1', y1);
  hit.setAttribute('x2', x2);
  hit.setAttribute('y2', y2);
  hit.setAttribute('stroke', 'transparent');
  hit.setAttribute('stroke-width', HIT_WIDTH);
  hit.setAttribute('stroke-linecap', 'round');
  hit.addEventListener('click', () => toggleEdge(type, r, c));
  boardEl.appendChild(hit);
}

function updateEdgeVisual(type, r, c) {
  const el = boardEl.querySelector(`.edge[data-edge="${key(type, r, c)}"]`);
  if (!el) return;
  if (state.on.has(key(type, r, c))) el.classList.add('on');
  else el.classList.remove('on', 'win');
}

function markAllWin() {
  for (const k of state.on) {
    const el = boardEl.querySelector(`.edge[data-edge="${k}"]`);
    if (el) el.classList.add('win');
  }
}

// --- Validation --------------------------------------------------------
function countCellEdges(r, c) {
  let n = 0;
  if (edgeOn('h', r, c)) n++;
  if (edgeOn('h', r + 1, c)) n++;
  if (edgeOn('v', r, c)) n++;
  if (edgeOn('v', r, c + 1)) n++;
  return n;
}

function vertexDegree(r, c) {
  let n = 0;
  if (r > 0          && edgeOn('v', r - 1, c)) n++;
  if (r < state.rows && edgeOn('v', r, c))     n++;
  if (c > 0          && edgeOn('h', r, c - 1)) n++;
  if (c < state.cols && edgeOn('h', r, c))     n++;
  return n;
}

function check() {
  // 1. Clues
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const clue = state.clues[r][c];
      if (clue == null) continue;
      if (countCellEdges(r, c) !== clue) {
        setMessage(`Clue at row ${r + 1}, col ${c + 1} is wrong.`, 'bad');
        return false;
      }
    }
  }
  // 2. Vertex degrees
  for (let r = 0; r <= state.rows; r++) {
    for (let c = 0; c <= state.cols; c++) {
      const d = vertexDegree(r, c);
      if (d !== 0 && d !== 2) {
        setMessage('Each dot must be used by zero or two segments.', 'bad');
        return false;
      }
    }
  }
  // 3. Single connected loop
  if (state.on.size === 0) {
    setMessage('Draw some segments first.', 'warn');
    return false;
  }
  if (!isSingleLoop()) {
    setMessage('Looks like more than one loop. Connect them.', 'bad');
    return false;
  }
  return true;
}

function isSingleLoop() {
  // Walk the edge graph; if we visit all "on" edges, it's a single loop.
  // Pick any on edge, walk its vertices.
  const onEdges = Array.from(state.on);
  if (onEdges.length === 0) return false;

  // Build neighbours: vertex -> list of (other vertex, edge key)
  const adj = new Map();
  const addAdj = (v1, v2, k) => {
    if (!adj.has(v1)) adj.set(v1, []);
    adj.get(v1).push({ to: v2, edge: k });
  };
  for (const k of state.on) {
    const [type, r, c] = k.split(':');
    const R = +r, C = +c;
    let v1, v2;
    if (type === 'h') { v1 = `${R}:${C}`; v2 = `${R}:${C + 1}`; }
    else              { v1 = `${R}:${C}`; v2 = `${R + 1}:${C}`; }
    addAdj(v1, v2, k);
    addAdj(v2, v1, k);
  }

  // BFS across edges
  const visited = new Set();
  const start = onEdges[0];
  visited.add(start);
  const queue = [start];
  while (queue.length) {
    const e = queue.shift();
    const [type, r, c] = e.split(':');
    const R = +r, C = +c;
    let v1, v2;
    if (type === 'h') { v1 = `${R}:${C}`; v2 = `${R}:${C + 1}`; }
    else              { v1 = `${R}:${C}`; v2 = `${R + 1}:${C}`; }
    for (const v of [v1, v2]) {
      for (const { edge } of adj.get(v) || []) {
        if (!visited.has(edge)) { visited.add(edge); queue.push(edge); }
      }
    }
  }
  return visited.size === state.on.size;
}

// --- Win flow ----------------------------------------------------------
function onCheck() {
  if (state.won) return;
  if (check()) {
    state.won = true;
    markAllWin();
    setMessage('Solved — the loop is one continuous knot.', 'good');
    const progress = loadProgress();
    if (!progress.solved.includes(state.idx)) progress.solved.push(state.idx);
    saveProgress(progress);
    $('win-summary').textContent =
      `${PUZZLES[state.idx].name} · ${state.on.size} segments · ${progress.solved.length}/${PUZZLES.length} solved`;
    overlayWin.classList.remove('hidden');
  }
}

function nextPuzzle() {
  if (state.idx >= PUZZLES.length - 1) return;
  const next = state.idx + 1;
  const progress = loadProgress();
  progress.current = next;
  saveProgress(progress);
  overlayWin.classList.add('hidden');
  newPuzzle(next);
}

function prevPuzzle() {
  if (state.idx <= 0) return;
  const next = state.idx - 1;
  const progress = loadProgress();
  progress.current = next;
  saveProgress(progress);
  overlayWin.classList.add('hidden');
  newPuzzle(next);
}

function clearBoard() {
  state.on.clear();
  state.won = false;
  buildBoard();
  setMessage('');
  updateHud();
}

// --- Wire up -----------------------------------------------------------
$('btn-check').addEventListener('click', onCheck);
$('btn-next').addEventListener('click', nextPuzzle);
$('btn-prev').addEventListener('click', prevPuzzle);
$('btn-clear').addEventListener('click', clearBoard);
$('btn-next-puzzle').addEventListener('click', () => {
  if (state.idx < PUZZLES.length - 1) nextPuzzle();
  else { overlayWin.classList.add('hidden'); }
});
$('btn-home').addEventListener('click', () => { window.location.href = '../../'; });
$('btn-help').addEventListener('click', () => overlayHelp.classList.remove('hidden'));
$('btn-help-close').addEventListener('click', () => overlayHelp.classList.add('hidden'));

const progress = loadProgress();
const startIdx = Math.min(Math.max(progress.current || 0, 0), PUZZLES.length - 1);
newPuzzle(startIdx);
