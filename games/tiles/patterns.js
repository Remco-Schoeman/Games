// SVG pattern generators inspired by Portuguese azulejo motifs.
// Each function returns inner SVG markup for a 100x100 viewBox, drawn in `color`.
// A larger pool is provided so we can randomly pick 20 per game.

const PATTERN_LIBRARY = [
  // 1. Filled disc
  (c) => `<circle cx="50" cy="50" r="34" fill="${c}"/>`,

  // 2. Concentric rings
  (c) => `<circle cx="50" cy="50" r="38" fill="none" stroke="${c}" stroke-width="6"/>
          <circle cx="50" cy="50" r="18" fill="${c}"/>`,

  // 3. Diamond
  (c) => `<polygon points="50,8 92,50 50,92 8,50" fill="${c}"/>`,

  // 4. Five-point star
  (c) => `<polygon points="50,6 61,38 95,38 67,58 78,92 50,72 22,92 33,58 5,38 39,38" fill="${c}"/>`,

  // 5. Greek cross
  (c) => `<rect x="40" y="10" width="20" height="80" fill="${c}"/>
          <rect x="10" y="40" width="80" height="20" fill="${c}"/>`,

  // 6. Triangle up
  (c) => `<polygon points="50,12 90,84 10,84" fill="${c}"/>`,

  // 7. Square
  (c) => `<rect x="20" y="20" width="60" height="60" fill="${c}"/>`,

  // 8. Hexagon
  (c) => `<polygon points="50,6 90,28 90,72 50,94 10,72 10,28" fill="${c}"/>`,

  // 9. Quatrefoil
  (c) => `<circle cx="30" cy="50" r="22" fill="${c}"/>
          <circle cx="70" cy="50" r="22" fill="${c}"/>
          <circle cx="50" cy="30" r="22" fill="${c}"/>
          <circle cx="50" cy="70" r="22" fill="${c}"/>`,

  // 10. Six-petal flower
  (c) => {
    const petals = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      const x = 50 + Math.cos(a) * 22;
      const y = 50 + Math.sin(a) * 22;
      petals.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="${c}"/>`);
    }
    return petals.join('') + `<circle cx="50" cy="50" r="10" fill="${c}"/>`;
  },

  // 11. Sun rays
  (c) => {
    const rays = [];
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      const x1 = 50 + Math.cos(a) * 22;
      const y1 = 50 + Math.sin(a) * 22;
      const x2 = 50 + Math.cos(a) * 44;
      const y2 = 50 + Math.sin(a) * 44;
      rays.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`);
    }
    return rays.join('') + `<circle cx="50" cy="50" r="16" fill="${c}"/>`;
  },

  // 12. Spiral (approx)
  (c) => {
    let d = 'M50,50';
    for (let i = 0; i < 48; i++) {
      const a = i * 0.45;
      const r = 2 + i * 0.85;
      const x = 50 + Math.cos(a) * r;
      const y = 50 + Math.sin(a) * r;
      d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
  },

  // 13. Wave / lozenge band
  (c) => `<path d="M5,50 Q27,20 50,50 T95,50" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
          <path d="M5,72 Q27,42 50,72 T95,72" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`,

  // 14. Grid / checker
  (c) => {
    let s = '';
    for (let r = 0; r < 4; r++) {
      for (let cc = 0; cc < 4; cc++) {
        if ((r + cc) % 2 === 0) {
          s += `<rect x="${10 + cc * 20}" y="${10 + r * 20}" width="20" height="20" fill="${c}"/>`;
        }
      }
    }
    return s;
  },

  // 15. Chevron
  (c) => `<polyline points="10,30 50,60 90,30" fill="none" stroke="${c}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
          <polyline points="10,55 50,85 90,55" fill="none" stroke="${c}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>`,

  // 16. Dot grid
  (c) => {
    let s = '';
    for (let r = 0; r < 4; r++)
      for (let cc = 0; cc < 4; cc++)
        s += `<circle cx="${17 + cc * 22}" cy="${17 + r * 22}" r="5" fill="${c}"/>`;
    return s;
  },

  // 17. Stripes
  (c) => `<rect x="12" y="10" width="10" height="80" fill="${c}"/>
          <rect x="36" y="10" width="10" height="80" fill="${c}"/>
          <rect x="60" y="10" width="10" height="80" fill="${c}"/>
          <rect x="84" y="10" width="6" height="80" fill="${c}"/>`,

  // 18. Big X
  (c) => `<line x1="14" y1="14" x2="86" y2="86" stroke="${c}" stroke-width="11" stroke-linecap="round"/>
          <line x1="86" y1="14" x2="14" y2="86" stroke="${c}" stroke-width="11" stroke-linecap="round"/>`,

  // 19. Tulip
  (c) => `<path d="M50,88 L50,52" stroke="${c}" stroke-width="4"/>
          <path d="M30,52 Q30,20 50,20 Q70,20 70,52 Q60,60 50,40 Q40,60 30,52 Z" fill="${c}"/>`,

  // 20. Compass / 8-point star
  (c) => `<polygon points="50,8 58,42 92,50 58,58 50,92 42,58 8,50 42,42" fill="${c}"/>`,

  // 21. Square ring
  (c) => `<rect x="14" y="14" width="72" height="72" fill="none" stroke="${c}" stroke-width="8"/>
          <rect x="40" y="40" width="20" height="20" fill="${c}"/>`,

  // 22. Diagonal stripes
  (c) => `<line x1="-10" y1="30" x2="60" y2="-40" stroke="${c}" stroke-width="11"/>
          <line x1="-10" y1="70" x2="100" y2="-40" stroke="${c}" stroke-width="11"/>
          <line x1="-10" y1="110" x2="140" y2="-40" stroke="${c}" stroke-width="11"/>
          <line x1="40" y1="110" x2="140" y2="10" stroke="${c}" stroke-width="11"/>`,

  // 23. Triangle down
  (c) => `<polygon points="10,16 90,16 50,88" fill="${c}"/>`,

  // 24. Half-circle
  (c) => `<path d="M14,68 A36,36 0 0 1 86,68 Z" fill="${c}"/>`,

  // 25. Bowtie
  (c) => `<polygon points="14,18 86,82 86,18 14,82" fill="${c}"/>`,

  // 26. Heart-ish bud
  (c) => `<path d="M50,86 C12,60 22,22 50,42 C78,22 88,60 50,86 Z" fill="${c}"/>`,

  // 27. Two interlocked rings
  (c) => `<circle cx="36" cy="50" r="22" fill="none" stroke="${c}" stroke-width="6"/>
          <circle cx="64" cy="50" r="22" fill="none" stroke="${c}" stroke-width="6"/>`,

  // 28. Pinwheel
  (c) => `<path d="M50,50 L50,10 Q70,10 70,30 Z" fill="${c}"/>
          <path d="M50,50 L90,50 Q90,70 70,70 Z" fill="${c}"/>
          <path d="M50,50 L50,90 Q30,90 30,70 Z" fill="${c}"/>
          <path d="M50,50 L10,50 Q10,30 30,30 Z" fill="${c}"/>`,
];

// Stable id for each pattern, used as the equality key.
export const PATTERN_POOL = PATTERN_LIBRARY.map((fn, i) => ({ id: i, render: fn }));
