// Azulejo-style SVG pattern generators. Each function returns inner SVG markup
// drawn on a 100x100 viewBox in the supplied `color`, sized to reach the tile
// edges so the grid tessellates like Portuguese tile work.
// 20 patterns are randomly picked from this pool each game.

const PATTERN_LIBRARY = [
  // 1. Quatrefoil — central square + 4 hemispheres
  (c) => `
    <rect x="32" y="32" width="36" height="36" fill="${c}"/>
    <circle cx="50" cy="14" r="20" fill="${c}"/>
    <circle cx="50" cy="86" r="20" fill="${c}"/>
    <circle cx="14" cy="50" r="20" fill="${c}"/>
    <circle cx="86" cy="50" r="20" fill="${c}"/>
  `,

  // 2. 8-point star
  (c) => {
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16 - Math.PI / 2;
      const r = i % 2 === 0 ? 48 : 24;
      pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="${c}"/>`;
  },

  // 3. Concentric rings
  (c) => `
    <circle cx="50" cy="50" r="46" fill="none" stroke="${c}" stroke-width="4"/>
    <circle cx="50" cy="50" r="34" fill="none" stroke="${c}" stroke-width="3"/>
    <circle cx="50" cy="50" r="22" fill="none" stroke="${c}" stroke-width="3"/>
    <circle cx="50" cy="50" r="8" fill="${c}"/>
  `,

  // 4. Cross of five squares
  (c) => `
    <rect x="38" y="2" width="24" height="24" fill="${c}"/>
    <rect x="38" y="74" width="24" height="24" fill="${c}"/>
    <rect x="2" y="38" width="24" height="24" fill="${c}"/>
    <rect x="74" y="38" width="24" height="24" fill="${c}"/>
    <rect x="38" y="38" width="24" height="24" fill="${c}"/>
  `,

  // 5. Nested square + lozenge
  (c) => `
    <rect x="4" y="4" width="92" height="92" fill="none" stroke="${c}" stroke-width="4"/>
    <polygon points="50,12 88,50 50,88 12,50" fill="none" stroke="${c}" stroke-width="3"/>
    <rect x="38" y="38" width="24" height="24" fill="${c}"/>
  `,

  // 6. Pinwheel
  (c) => `
    <path d="M50,50 L50,4 Q74,4 74,28 Z" fill="${c}"/>
    <path d="M50,50 L96,50 Q96,74 72,74 Z" fill="${c}"/>
    <path d="M50,50 L50,96 Q26,96 26,72 Z" fill="${c}"/>
    <path d="M50,50 L4,50 Q4,26 28,26 Z" fill="${c}"/>
  `,

  // 7. Six-circle flower-of-life
  (c) => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      const x = 50 + Math.cos(a) * 22;
      const y = 50 + Math.sin(a) * 22;
      out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="22" fill="none" stroke="${c}" stroke-width="4"/>`);
    }
    return out.join('');
  },

  // 8. Diagonal lattice
  (c) => `
    <line x1="0" y1="20" x2="80" y2="100" stroke="${c}" stroke-width="6"/>
    <line x1="0" y1="50" x2="50" y2="100" stroke="${c}" stroke-width="6"/>
    <line x1="0" y1="80" x2="20" y2="100" stroke="${c}" stroke-width="6"/>
    <line x1="20" y1="0" x2="100" y2="80" stroke="${c}" stroke-width="6"/>
    <line x1="50" y1="0" x2="100" y2="50" stroke="${c}" stroke-width="6"/>
    <line x1="80" y1="0" x2="100" y2="20" stroke="${c}" stroke-width="6"/>
    <line x1="0" y1="80" x2="80" y2="0" stroke="${c}" stroke-width="6"/>
    <line x1="0" y1="50" x2="50" y2="0" stroke="${c}" stroke-width="6"/>
    <line x1="0" y1="20" x2="20" y2="0" stroke="${c}" stroke-width="6"/>
    <line x1="20" y1="100" x2="100" y2="20" stroke="${c}" stroke-width="6"/>
    <line x1="50" y1="100" x2="100" y2="50" stroke="${c}" stroke-width="6"/>
    <line x1="80" y1="100" x2="100" y2="80" stroke="${c}" stroke-width="6"/>
  `,

  // 9. Filled lozenge
  (c) => `<polygon points="50,4 96,50 50,96 4,50" fill="${c}"/>`,

  // 10. Corner wedges + centre diamond
  (c) => `
    <polygon points="0,0 36,0 0,36" fill="${c}"/>
    <polygon points="100,0 64,0 100,36" fill="${c}"/>
    <polygon points="0,100 36,100 0,64" fill="${c}"/>
    <polygon points="100,100 64,100 100,64" fill="${c}"/>
    <polygon points="50,30 70,50 50,70 30,50" fill="${c}"/>
  `,

  // 11. Sunburst
  (c) => {
    const rays = [];
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      const x1 = 50 + Math.cos(a) * 18;
      const y1 = 50 + Math.sin(a) * 18;
      const x2 = 50 + Math.cos(a) * 48;
      const y2 = 50 + Math.sin(a) * 48;
      rays.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`);
    }
    return rays.join('') + `<circle cx="50" cy="50" r="14" fill="${c}"/>`;
  },

  // 12. Wave bands top & bottom
  (c) => `
    <path d="M0,18 Q12,4 24,18 T48,18 T72,18 T96,18 L100,18 L100,0 L0,0 Z" fill="${c}"/>
    <path d="M0,82 Q12,96 24,82 T48,82 T72,82 T96,82 L100,82 L100,100 L0,100 Z" fill="${c}"/>
  `,

  // 13. Linked rings
  (c) => `
    <circle cx="30" cy="50" r="26" fill="none" stroke="${c}" stroke-width="6"/>
    <circle cx="70" cy="50" r="26" fill="none" stroke="${c}" stroke-width="6"/>
  `,

  // 14. Octagon ring
  (c) => {
    const ptStr = (r) => {
      const arr = [];
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
        arr.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`);
      }
      return arr.join(' ');
    };
    return `<polygon points="${ptStr(46)}" fill="none" stroke="${c}" stroke-width="6"/>
            <polygon points="${ptStr(22)}" fill="${c}"/>`;
  },

  // 15. Square spiral
  (c) => `<path d="M8,8 L92,8 L92,92 L20,92 L20,22 L78,22 L78,78 L34,78 L34,36 L66,36 L66,64 L48,64"
                fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="miter"/>`,

  // 16. Floral medallion with leaf arms
  (c) => `
    <circle cx="50" cy="50" r="12" fill="${c}"/>
    <path d="M50,38 C40,22 40,8 50,2 C60,8 60,22 50,38 Z" fill="${c}"/>
    <path d="M50,62 C40,78 40,92 50,98 C60,92 60,78 50,62 Z" fill="${c}"/>
    <path d="M38,50 C22,40 8,40 2,50 C8,60 22,60 38,50 Z" fill="${c}"/>
    <path d="M62,50 C78,40 92,40 98,50 C92,60 78,60 62,50 Z" fill="${c}"/>
  `,

  // 17. X with central disc
  (c) => `
    <line x1="6" y1="6" x2="94" y2="94" stroke="${c}" stroke-width="11"/>
    <line x1="94" y1="6" x2="6" y2="94" stroke="${c}" stroke-width="11"/>
    <circle cx="50" cy="50" r="18" fill="${c}"/>
  `,

  // 18. Bordered Greek cross
  (c) => `
    <rect x="3" y="3" width="94" height="94" fill="none" stroke="${c}" stroke-width="3"/>
    <rect x="42" y="14" width="16" height="72" fill="${c}"/>
    <rect x="14" y="42" width="72" height="16" fill="${c}"/>
  `,

  // 19. Two filled triangles, tips meeting at the centre
  (c) => `
    <polygon points="0,0 100,0 50,50" fill="${c}"/>
    <polygon points="0,100 100,100 50,50" fill="${c}"/>
  `,

  // 20. Four corner discs + centre diamond
  (c) => `
    <circle cx="22" cy="22" r="18" fill="${c}"/>
    <circle cx="78" cy="22" r="18" fill="${c}"/>
    <circle cx="22" cy="78" r="18" fill="${c}"/>
    <circle cx="78" cy="78" r="18" fill="${c}"/>
    <polygon points="50,32 68,50 50,68 32,50" fill="${c}"/>
  `,

  // 21. Three horizontal bands
  (c) => `
    <rect x="0" y="6" width="100" height="14" fill="${c}"/>
    <rect x="0" y="43" width="100" height="14" fill="${c}"/>
    <rect x="0" y="80" width="100" height="14" fill="${c}"/>
  `,

  // 22. Bordered quatrefoil
  (c) => `
    <rect x="3" y="3" width="94" height="94" fill="none" stroke="${c}" stroke-width="3"/>
    <rect x="40" y="40" width="20" height="20" fill="${c}"/>
    <circle cx="50" cy="22" r="12" fill="${c}"/>
    <circle cx="50" cy="78" r="12" fill="${c}"/>
    <circle cx="22" cy="50" r="12" fill="${c}"/>
    <circle cx="78" cy="50" r="12" fill="${c}"/>
  `,

  // 23. Nested diamonds
  (c) => `
    <polygon points="50,4 80,50 50,96 20,50" fill="none" stroke="${c}" stroke-width="4"/>
    <polygon points="50,28 64,50 50,72 36,50" fill="${c}"/>
  `,

  // 24. Compass rose — 8 identical kite arms, 45° apart
  (c) => {
    const cx = 50, cy = 50;
    const tipDist = 46;
    const wideDist = 36;
    const halfWidth = 6;
    const arms = [];
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      const ca = Math.cos(a), sa = Math.sin(a);
      const tx = cx + ca * tipDist, ty = cy + sa * tipDist;
      const wx = cx + ca * wideDist, wy = cy + sa * wideDist;
      const px = -sa, py = ca; // perpendicular to arm direction
      const w1x = wx + px * halfWidth, w1y = wy + py * halfWidth;
      const w2x = wx - px * halfWidth, w2y = wy - py * halfWidth;
      arms.push(`<polygon points="${tx.toFixed(1)},${ty.toFixed(1)} ${w1x.toFixed(1)},${w1y.toFixed(1)} ${cx},${cy} ${w2x.toFixed(1)},${w2y.toFixed(1)}" fill="${c}"/>`);
    }
    return arms.join('') + `<circle cx="${cx}" cy="${cy}" r="8" fill="${c}"/>`;
  },
];

export const PATTERN_POOL = PATTERN_LIBRARY.map((fn, i) => ({ id: i, render: fn }));

export const COLOR_PALETTE = [
  '#0d3b6f', // cobalt
  '#5b8cc4', // sky blue
  '#0a2a4a', // dark navy
  '#d4a02a', // mustard yellow
  '#a44f24', // burnt sienna
  '#14492b', // dark green
  '#7fb07a', // light green
];
