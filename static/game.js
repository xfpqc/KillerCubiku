/**
 * Cubiku Variants v132 — Killer 3D Sudoku (Sound 3D logic grader + 3D-coupled cage generator)
 */

let currentVariant = "killer";
let currentCages = [];
let cageMap = [];

/* Muted, matte jewel tones for dark mode */
const CAGE_RGB = [
    '152, 52, 58',    /* Muted Crimson */
    '158, 78, 42',    /* Terracotta */
    '142, 108, 38',   /* Warm Ochre */
    '64, 122, 62',    /* Sage Green */
    '42, 122, 86',    /* Jade Pine */
    '42, 116, 122',   /* Deep Teal */
    '48, 102, 152',   /* Steel Cerulean */
    '68, 88, 158',    /* Muted Cobalt */
    '98, 74, 154',    /* Dusk Indigo */
    '132, 68, 142',   /* Muted Plum */
    '152, 58, 104',   /* Dusty Berry */
    '74, 96, 118'     /* Cool Slate */
];

/* Distinct, higher-contrast pastels for light mode (alternating warm/cool) */
const CAGE_LIGHT_RGB = [
    '239, 154, 154',  /* Soft Coral */
    '144, 202, 249',  /* Clear Sky Blue */
    '248, 196, 113',  /* Warm Marigold */
    '165, 214, 167',  /* Fresh Sage */
    '206, 147, 216',  /* Soft Orchid */
    '128, 222, 234',  /* Crisp Aqua */
    '255, 183, 138',  /* Warm Apricot */
    '159, 168, 218',  /* Periwinkle */
    '197, 225, 165',  /* Meadow Lime */
    '244, 143, 177',  /* Rose Pink */
    '128, 203, 196',  /* Seafoam Mint */
    '176, 190, 197'   /* Cool Blue-Slate */
];

const CAGE_COLORS = CAGE_RGB.map(rgb => `rgb(${rgb})`);
const B64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const STANDARD_CUBIKU_URL = 'https://xfpqc.github.io/Cubiku/';

function getCageBackground(cage) {
    const isLight = currentColorMode === 'light';
    const palette = isLight ? CAGE_LIGHT_RGB : CAGE_RGB;

    if (typeof cage.colorIndex === 'number' && palette[cage.colorIndex]) {
        return `rgb(${palette[cage.colorIndex]})`;
    }
    if (typeof cage.color === 'string') {
        if (!isLight) return cage.color;
        const match = cage.color.match(/rgba?\(\s*(\d+\s*,\s*\d+\s*,\s*\d+)/);
        if (match) {
            const idx = CAGE_RGB.indexOf(match[1].replace(/\s+/g, ', '));
            if (idx !== -1 && CAGE_LIGHT_RGB[idx]) {
                return `rgb(${CAGE_LIGHT_RGB[idx]})`;
            }
        }
        return cage.color;
    }
    return '';
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isValid(grid, x, y, z, num, n = 3, variant = currentVariant) {
  for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
          if (grid[z][i][j] === num) return false;
          if (grid[i][y][j] === num) return false;
          if (grid[i][j][x] === num) return false;
      }
  }
  return true;
}

function generateSolvedGrid(grid, n = 3, variant = 'standard') {
  const cells = [];
  for (let z = 0; z < n; z++) {
      for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) cells.push({ z, y, x });
      }
  }

  for (const { z, y, x } of cells) {
      if (grid[z][y][x] === 0) {
          let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
          shuffleArray(nums);

          for (const num of nums) {
              if (isValid(grid, x, y, z, num, n, variant)) {
                  grid[z][y][x] = num;
                  if (generateSolvedGrid(grid, n, variant)) return true;
                  grid[z][y][x] = 0;
              }
          }
          return false;
      }
  }
  return true;
}

/* Cage-shape profiles per difficulty.
   zBias   : weight of z-neighbours vs in-slice neighbours while growing a cage (forces 3D cages)
   maxMerge: largest cage a stray single cell may be merged into
   minCross: every z-slice must touch at least this many cages that leave the slice */
const CAGE_PROFILES = {
    casual:   { size: () => (Math.random() < 0.72 ? 2 : 3), maxMerge: 4, zBias: 1.6, minCross: 1 },
    easy:     { size: () => 2 + Math.floor(Math.random() * 2), maxMerge: 4, zBias: 1.6, minCross: 1 },
    medium:   { size: () => 2 + Math.floor(Math.random() * 2), maxMerge: 4, zBias: 2.0, minCross: 2 },
    hard:     { size: () => 3 + Math.floor(Math.random() * 2), maxMerge: 5, zBias: 2.0, minCross: 2 },
    fiendish: { size: () => (Math.random() < 0.65 ? 3 : 4), maxMerge: 5, zBias: 2.0, minCross: 2 }
};

const CELL_NEIGHBORS = (() => {
    const list = [];
    for (let i = 0; i < 27; i++) {
        const z = Math.floor(i / 9), y = Math.floor(i / 3) % 3, x = i % 3;
        const n = [];
        if (z > 0) n.push({ j: i - 9, zMove: true });
        if (z < 2) n.push({ j: i + 9, zMove: true });
        if (y > 0) n.push({ j: i - 3, zMove: false });
        if (y < 2) n.push({ j: i + 3, zMove: false });
        if (x > 0) n.push({ j: i - 1, zMove: false });
        if (x < 2) n.push({ j: i + 1, zMove: false });
        list.push(n);
    }
    return list;
})();

function isCageConnected(idxList) {
    if (idxList.length <= 1) return true;
    const set = new Set(idxList);
    const seen = new Set([idxList[0]]);
    const stack = [idxList[0]];
    while (stack.length) {
        const i = stack.pop();
        for (const { j } of CELL_NEIGHBORS[i]) if (set.has(j) && !seen.has(j)) { seen.add(j); stack.push(j); }
    }
    return seen.size === set.size;
}

function weightedPick(items, weightOf) {
    let total = 0;
    for (const it of items) total += weightOf(it);
    let r = Math.random() * total;
    for (const it of items) { r -= weightOf(it); if (r <= 0) return it; }
    return items[items.length - 1];
}

/* Converts flat-index cage groups into the public cage objects ({id, cells, sum, colorIndex, color}). */
function finalizeCages(groups, solvedGrid) {
    const val = i => solvedGrid[Math.floor(i / 9)][Math.floor(i / 3) % 3][i % 3];
    return groups.map((g, id) => {
        const sorted = [...g].sort((a, b) => a - b);
        const colorIdx = id % CAGE_COLORS.length;
        return {
            id,
            cells: sorted.map(i => ({ z: Math.floor(i / 9), y: Math.floor(i / 3) % 3, x: i % 3 })),
            sum: sorted.reduce((s, i) => s + val(i), 0),
            colorIndex: colorIdx,
            color: CAGE_COLORS[colorIdx]
        };
    });
}

function buildCageGroups(solvedGrid, profile) {
    const val = i => solvedGrid[Math.floor(i / 9)][Math.floor(i / 3) % 3][i % 3];
    const owner = new Int8Array(27).fill(-1);
    const groups = [];
    const order = shuffleArray([...Array(27).keys()]);

    for (const start of order) {
        if (owner[start] !== -1) continue;
        const cage = [start];
        owner[start] = groups.length;
        const target = profile.size();
        while (cage.length < target) {
            const options = [];
            for (const i of cage) {
                for (const nb of CELL_NEIGHBORS[i]) {
                    if (owner[nb.j] !== -1 || options.some(o => o.j === nb.j)) continue;
                    if (cage.some(c => val(c) === val(nb.j))) continue;
                    options.push(nb);
                }
            }
            if (!options.length) break;
            const pick = weightedPick(options, o => (o.zMove ? profile.zBias : 1));
            cage.push(pick.j);
            owner[pick.j] = groups.length;
        }
        groups.push(cage);
    }

    /* Absorb stray single cells: merge into a neighbouring cage, else pair with a cell
       borrowed from a neighbouring cage that stays connected. Only true leftovers become clues. */
    for (let g = 0; g < groups.length; g++) {
        if (groups[g].length !== 1) continue;
        const lone = groups[g][0];
        const adj = shuffleArray(CELL_NEIGHBORS[lone].map(nb => owner[nb.j]).filter(o => o !== g));
        adj.sort((a, b) => groups[a].length - groups[b].length);
        const host = adj.find(o => groups[o].length > 1 && groups[o].length < profile.maxMerge &&
                                   !groups[o].some(c => val(c) === val(lone)));
        if (host !== undefined) {
            groups[host].push(lone); owner[lone] = host; groups[g] = [];
            continue;
        }
        for (const nb of shuffleArray([...CELL_NEIGHBORS[lone]])) {
            const o = owner[nb.j];
            if (o === g || groups[o].length < 3) continue;
            const rest = groups[o].filter(c => c !== nb.j);
            if (!isCageConnected(rest)) continue;
            groups[o] = rest;
            groups[g] = [lone, nb.j];
            owner[nb.j] = g;
            break;
        }
    }
    return groups.filter(g => g.length > 0);
}

function sliceCrossCounts(groups) {
    const cross = [0, 0, 0];
    for (const g of groups) {
        const zs = new Set(g.map(i => Math.floor(i / 9)));
        if (zs.size > 1) for (const z of zs) cross[z]++;
    }
    return cross;
}

function generateCages(solvedGrid, difficulty = 'medium') {
    const profile = CAGE_PROFILES[difficulty] || CAGE_PROFILES.medium;
    let best = null, bestScore = -Infinity;
    for (let attempt = 0; attempt < 12; attempt++) {
        const groups = buildCageGroups(solvedGrid, profile);
        const lone = groups.filter(g => g.length === 1).length;
        const minCross = Math.min(...sliceCrossCounts(groups));
        const fit = Math.min(minCross, profile.minCross) * 10 - lone * 4;
        if (fit > bestScore) { bestScore = fit; best = groups; }
        if (minCross >= profile.minCross && lone === 0) break;
    }
    return finalizeCages(best, solvedGrid);
}

/* Splits one still-unsolved cage of ≥ 4 cells into two connected cages of ≥ 2 cells.
   Used instead of adding a given when a hard/fiendish layout is stuck on a zero clue budget. */
function splitStuckCage(cages, logicState, solvedGrid) {
    const options = cages
        .filter(c => c.cells.length >= 4 && c.cells.some(p => logicState.grid[p.z][p.y][p.x] === 0))
        .sort((a, b) => b.cells.length - a.cells.length);
    for (const cage of options) {
        const idx = cage.cells.map(p => 9 * p.z + 3 * p.y + p.x);
        const n = idx.length;
        const splits = [];
        for (let m = 1; m < (1 << n) - 1; m++) {
            if (m & 1) continue; /* canonical: cell 0 always in part B */
            const A = idx.filter((_, k) => (m >> k) & 1), B = idx.filter((_, k) => !((m >> k) & 1));
            if (A.length >= 2 && B.length >= 2 && isCageConnected(A) && isCageConnected(B)) splits.push([A, B]);
        }
        if (!splits.length) continue;
        const [A, B] = splits[Math.floor(Math.random() * splits.length)];
        const groups = cages.filter(c => c !== cage).map(c => c.cells.map(p => 9 * p.z + 3 * p.y + p.x));
        groups.push(A, B);
        return finalizeCages(groups, solvedGrid);
    }
    return null;
}

// ---------------------------------------------------------
// COMPACT BASE64URL CAGE-AND-SUM ENCODER / DECODER (?k=...&d=...)
// ---------------------------------------------------------
function encodeKillerPuzzle(cages, initGrid, clues) {
    const sortedCages = cages
        .map(c => ({
            sum: c.sum,
            cells: [...c.cells].sort((a, b) => (9 * a.z + 3 * a.y + a.x) - (9 * b.z + 3 * b.y + b.x))
        }))
        .sort((a, b) => (9 * a.cells[0].z + 3 * a.cells[0].y + a.cells[0].x) - (9 * b.cells[0].z + 3 * b.cells[0].y + b.cells[0].x));

    const M = sortedCages.length;
    const cellCageId = new Array(27).fill(0);
    for (let k = 0; k < M; k++) {
        for (const c of sortedCages[k].cells) {
            cellCageId[9 * c.z + 3 * c.y + c.x] = k + 1;
        }
    }

    let clueMask = 0n;
    const clueDigits = [];
    for (let i = 0; i < 27; i++) {
        const z = Math.floor(i / 9), y = Math.floor((i % 9) / 3), x = i % 3;
        const val = initGrid && initGrid[z] && initGrid[z][y] ? initGrid[z][y][x] : 0;
        if (clues.has(`${z},${y},${x}`) && val >= 1 && val <= 9) {
            clueMask |= (1n << BigInt(i));
            clueDigits.push(val);
        }
    }

    let packed = 0n;
    let bitPos = 0n;
    const pushBits = (value, width) => {
        const w = BigInt(width);
        packed |= (BigInt(value) & ((1n << w) - 1n)) << bitPos;
        bitPos += w;
    };

    pushBits(M, 4);
    for (let i = 0; i < 27; i++) pushBits(cellCageId[i], 4);
    for (let k = 0; k < M; k++) pushBits(sortedCages[k].sum, 6);
    pushBits(clueMask, 27);
    for (const d of clueDigits) pushBits(d, 4);

    const totalChars = Math.ceil(Number(bitPos) / 6);
    let out = '';
    for (let c = 0; c < totalChars; c++) {
        const sextet = Number((packed >> BigInt(c * 6)) & 0x3Fn);
        out += B64URL_CHARS[sextet];
    }
    return out.replace(/A+$/, '') || 'A';
}

/* Finds a solution for decoded/shared puzzles. Generated boards are finished instantly by the
   sound logic solver; anything else (legacy or hand-made links) falls back to guess-and-propagate:
   branch on the cell with fewest candidates and let the logic solver propagate each guess.
   The old fixed-order DFS hit its 25k-step cap on most zero-given hard/fiendish boards, so valid
   share links were rejected as "Invalid puzzle link". */
function solveKillerBacktrack(cages, initGrid) {
    let nodes = 0;
    const MAX_NODES = 3000;

    function search(givens) {
        if (++nodes > MAX_NODES) return null;
        const r = solveLogically(cages, givens, 4);
        if (r.solved) return r.grid;
        if (!r.valid) return null;
        let best = null, bestCount = 10;
        for (let z = 0; z < 3; z++)
            for (let y = 0; y < 3; y++)
                for (let x = 0; x < 3; x++) {
                    if (r.grid[z][y][x]) continue;
                    const c = popcount9(r.cands[z][y][x]);
                    if (c < bestCount) { bestCount = c; best = { z, y, x }; }
                }
        if (!best) return null;
        let m = r.cands[best.z][best.y][best.x];
        while (m) {
            const bit = m & -m; m ^= bit;
            const next = copyGrid(r.grid);
            next[best.z][best.y][best.x] = 31 - Math.clz32(bit) + 1;
            const found = search(next);
            if (found) return found;
        }
        return null;
    }
    return search(initGrid);
}

function decodeKillerPuzzle(encoded) {
    if (typeof encoded !== 'string' || encoded.length < 18 || encoded.length > 48) return null;

    let packed = 0n;
    for (let c = 0; c < encoded.length; c++) {
        const idx = B64URL_CHARS.indexOf(encoded[c]);
        if (idx === -1) return null;
        packed |= BigInt(idx) << BigInt(c * 6);
    }

    let bitPos = 0n;
    const readBits = (width) => {
        const w = BigInt(width);
        const val = (packed >> bitPos) & ((1n << w) - 1n);
        bitPos += w;
        return val;
    };

    const M = Number(readBits(4));
    if (M < 0 || M > 13) return null;

    const cellCageId = new Array(27);
    for (let i = 0; i < 27; i++) {
        const cid = Number(readBits(4));
        if (cid > M) return null;
        cellCageId[i] = cid;
    }

    const sums = new Array(M);
    for (let k = 0; k < M; k++) {
        const s = Number(readBits(6));
        if (s < 1 || s > 45) return null;
        sums[k] = s;
    }

    const clueMask = readBits(27);
    const initG = emptyGrid();
    const clues = [];

    for (let i = 0; i < 27; i++) {
        if ((clueMask >> BigInt(i)) & 1n) {
            const d = Number(readBits(4));
            if (d < 1 || d > 9) return null;
            const z = Math.floor(i / 9), y = Math.floor((i % 9) / 3), x = i % 3;
            initG[z][y][x] = d;
            clues.push(`${z},${y},${x}`);
        }
    }

    if ((packed >> bitPos) !== 0n) return null;
    if (M === 0 && clues.length === 0) return null;

    const cages = [];
    for (let k = 1; k <= M; k++) {
        const cells = [];
        for (let i = 0; i < 27; i++) {
            if (cellCageId[i] === k) {
                cells.push({
                    z: Math.floor(i / 9),
                    y: Math.floor((i % 9) / 3),
                    x: i % 3
                });
            }
        }
        if (cells.length < 2) return null;
        const colorIndex = (k - 1) % CAGE_COLORS.length;
        cages.push({
            id: k - 1,
            cells,
            sum: sums[k - 1],
            colorIndex,
            color: CAGE_COLORS[colorIndex]
        });
    }

    // Validate clue consistency across planes and cages
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                const v = initG[z][y][x];
                if (v !== 0) {
                    initG[z][y][x] = 0;
                    const ok = isValid(initG, x, y, z, v, 3, 'standard');
                    initG[z][y][x] = v;
                    if (!ok) return null;
                }
            }
        }
    }
    for (const cage of cages) {
        let pSum = 0;
        let empties = 0;
        const seen = new Set();
        for (const c of cage.cells) {
            const v = initG[c.z][c.y][c.x];
            if (v !== 0) {
                if (seen.has(v)) return null;
                seen.add(v);
                pSum += v;
            } else {
                empties++;
            }
        }
        if (empties === 0 && pSum !== cage.sum) return null;
        if (empties > 0 && pSum >= cage.sum) return null;
    }

    const solved = solveKillerBacktrack(cages, initG);
    if (!solved) return null;

    return {
        clues,
        initialGrid: initG,
        solvedGrid: solved,
        cages,
        map: buildCageMap(cages)
    };
}

// ---------------------------------------------------------
// PRECOMPUTED 3D CUBIKU GEOMETRY FOR HUMAN LOGIC SOLVER
// Flat cell index i = 9z + 3y + x; 27-bit cell masks fit in a signed int32.
// ---------------------------------------------------------
const PLANES_45 = (() => {
    const list = [];
    for (let z = 0; z < 3; z++) {
        const cells = [];
        for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) cells.push({ z, y, x });
        list.push({ axis: 'z', idx: z, target: 45, cells });
    }
    for (let y = 0; y < 3; y++) {
        const cells = [];
        for (let z = 0; z < 3; z++) for (let x = 0; x < 3; x++) cells.push({ z, y, x });
        list.push({ axis: 'y', idx: y, target: 45, cells });
    }
    for (let x = 0; x < 3; x++) {
        const cells = [];
        for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) cells.push({ z, y, x });
        list.push({ axis: 'x', idx: x, target: 45, cells });
    }
    return list;
})();

const Z_PLANES_45 = PLANES_45.filter(p => p.axis === 'z');
const DEPTH_PLANES_45 = PLANES_45.filter(p => p.axis !== 'z');

const PLANES_90 = (() => {
    const list = [];
    const pairs = [[0, 1], [1, 2], [0, 2]];
    for (const [a, b] of pairs) {
        list.push({ target: 90, cells: [...PLANES_45[a].cells, ...PLANES_45[b].cells] });
        list.push({ target: 90, cells: [...PLANES_45[3 + a].cells, ...PLANES_45[3 + b].cells] });
        list.push({ target: 90, cells: [...PLANES_45[6 + a].cells, ...PLANES_45[6 + b].cells] });
    }
    return list;
})();

const CUBE_GEO = (() => {
    const coords = [];
    for (let i = 0; i < 27; i++) coords.push([Math.floor(i / 9), Math.floor(i / 3) % 3, i % 3]);
    const toIdx = c => 9 * c.z + 3 * c.y + c.x;
    const planeCells = PLANES_45.map(p => p.cells.map(toIdx));          // 0-2 z, 3-5 y, 6-8 x
    const planeMask = planeCells.map(cells => cells.reduce((m, i) => m | (1 << i), 0));
    const slabMask = PLANES_90.map(p => p.cells.reduce((m, c) => m | (1 << toIdx(c)), 0));
    const peers = [], peerMask = [];
    for (let i = 0; i < 27; i++) {
        const list = [];
        let m = 0;
        for (let j = 0; j < 27; j++) {
            if (i === j) continue;
            if (coords[i][0] === coords[j][0] || coords[i][1] === coords[j][1] || coords[i][2] === coords[j][2]) {
                list.push(j); m |= 1 << j;
            }
        }
        peers.push(list); peerMask.push(m);
    }
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const transversals = [];
    for (const sy of perms) for (const sx of perms) {
        transversals.push([sy[0] * 3 + sx[0], 9 + sy[1] * 3 + sx[1], 18 + sy[2] * 3 + sx[2]]);
    }
    return { coords, toIdx, planeCells, planeMask, slabMask, peers, peerMask, transversals };
})();

const MAGIC_CAGE_MASKS = {
    3: { 6: 0b000000111, 7: 0b000001011, 23: 0b110100000, 24: 0b111000000 },  /* {123} {124} {689} {789} */
    4: { 10: 0b000001111, 11: 0b000010111, 29: 0b111010000, 30: 0b111100000 } /* {1234} {1235} {5789} {6789} */
};
const MAGIC_3_CELL_MASKS = MAGIC_CAGE_MASKS[3];

function popcount9(mask) {
    let c = 0, m = mask & 0x1ff;
    while (m) { m &= m - 1; c++; }
    return c;
}

function popcount27(m) {
    m = m - ((m >>> 1) & 0x55555555);
    m = (m & 0x33333333) + ((m >>> 2) & 0x33333333);
    return (((m + (m >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
}

/**
 * Finds all valid non-repeating digit assignments to `cells` summing to `targetSum`
 * given each cell's candidate bitmask `cellMasks`.
 */
function evaluateCageAssignments(cellMasks, targetSum) {
    const k = cellMasks.length;
    const allowedMasks = new Array(k).fill(0);
    let forcedMask = 0x1ff;
    let foundAny = false;

    const minRem = new Array(k + 1).fill(0);
    const maxRem = new Array(k + 1).fill(0);
    for (let i = k - 1; i >= 0; i--) {
        const m = cellMasks[i] & 0x1ff;
        if (!m) return { valid: false, allowedMasks, forcedMask: 0 };
        minRem[i] = minRem[i + 1] + (31 - Math.clz32(m & -m)) + 1;
        maxRem[i] = maxRem[i + 1] + (31 - Math.clz32(m)) + 1;
    }

    const chosen = new Array(k).fill(0);

    function dfs(idx, usedMask, partialSum) {
        if (partialSum + minRem[idx] > targetSum || partialSum + maxRem[idx] < targetSum) return;
        if (idx === k - 1) {
            const needed = targetSum - partialSum;
            const bit = 1 << (needed - 1);
            if (needed >= 1 && needed <= 9 && !(usedMask & bit) && (cellMasks[idx] & bit)) {
                chosen[idx] = bit;
                foundAny = true;
                forcedMask &= (usedMask | bit);
                for (let i = 0; i < k; i++) allowedMasks[i] |= chosen[i];
            }
            return;
        }
        let avail = cellMasks[idx] & ~usedMask & 0x1ff;
        while (avail) {
            const bit = avail & -avail;
            avail ^= bit;
            chosen[idx] = bit;
            dfs(idx + 1, usedMask | bit, partialSum + (31 - Math.clz32(bit)) + 1);
        }
    }

    if (k === 0) return { valid: targetSum === 0, allowedMasks, forcedMask: 0 };
    dfs(0, 0, 0);
    return { valid: foundAny, allowedMasks, forcedMask: foundAny ? forcedMask : 0 };
}

/* Static per-cage-layout data (cage masks + Rule-of-45/90 subset equations), memoised
   because the generator re-solves the same cage layout many times while adding clues. */
const killerLayoutCache = new WeakMap();

function getKillerLayout(cagesTest) {
    let layout = killerLayoutCache.get(cagesTest);
    if (layout) return layout;

    const cageOf = new Int8Array(27).fill(-1);
    const cages = cagesTest.map((cage, k) => {
        let mask = 0;
        const cells = cage.cells.map(c => CUBE_GEO.toIdx(c));
        for (const i of cells) { mask |= 1 << i; cageOf[i] = k; }
        return { sum: cage.sum, cells, mask };
    });

    /* "Must differ" mask per cell: geometric peers plus cage-mates. */
    const seeMask = CUBE_GEO.peerMask.slice();
    for (const cage of cages) for (const i of cage.cells) seeMask[i] |= cage.mask & ~(1 << i);

    /* Region-sum equations: sum(innies) - sum(outies) = delta, keeping only those
       with few enough cells to ever become useful once givens are subtracted. */
    function buildEquations(regionMask, target) {
        const touching = cages.filter(c => c.mask & regionMask);
        const n = touching.length;
        const out = [];
        if (n > 16) return out;
        const total = 1 << n;
        const subMask = new Int32Array(total), subSum = new Int32Array(total);
        const seen = new Set();
        for (let s = 1; s < total; s++) {
            const low = 31 - Math.clz32(s & -s);
            const prev = s & (s - 1);
            subMask[s] = subMask[prev] | touching[low].mask;
            subSum[s] = subSum[prev] + touching[low].sum;
            const inn = regionMask & ~subMask[s];
            const outM = subMask[s] & ~regionMask;
            if (popcount27(inn) + popcount27(outM) > 9) continue;
            const key = inn + ':' + outM;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ inn, out: outM, delta: target - subSum[s] });
        }
        /* Including zero cages: the full region is all innies. */
        if (popcount27(regionMask) <= 9) out.push({ inn: regionMask, out: 0, delta: target });
        return out;
    }

    layout = {
        cages, cageOf, seeMask,
        eq45: CUBE_GEO.planeMask.map(m => buildEquations(m, 45)),
        eq90: CUBE_GEO.slabMask.map(m => buildEquations(m, 90))
    };
    killerLayoutCache.set(cagesTest, layout);
    return layout;
}

/**
 * Human-style forward-chaining logic solver capped at `maxAllowedTier`.
 * Every rule is sound (never removes a true candidate), so `solved` also proves uniqueness.
 * - Tier 0 (Casual):   Naked Singles + Cage Last-Cell Singles (`sum - filled`)
 * - Tier 1 (Easy):     z-slice Hidden Singles + 2-cell cage combos + magic 3/4-cell sums
 * - Tier 2 (Medium):   Depth-plane (x/y) Hidden Singles, general cage combos, cage hidden singles,
 *                      cage-forced-digit pointing (any cell seeing all its slots), plane–line claiming,
 *                      naked/hidden pairs in planes
 * - Tier 3 (Hard):     Planar Rule of 45 with ≤ 2 unknown innies/outies, naked/hidden triples, XY-Wing
 * - Tier 4 (Fiendish): Rule of 45 with 3 unknowns, Rule of 90 slabs, XYZ-Wing,
 *                      digit pattern overlay (36 transversal templates)
 * Returns { solved, valid, maxTier, score, grid, cands, counts } (valid = no contradiction found) with 3D grid/cands for UI helpers.
 */
function solveLogically(cagesTest, initialClues = null, maxAllowedTier = 4) {
    const L = getKillerLayout(cagesTest);
    const G = CUBE_GEO;
    const grid = new Int8Array(27);
    const cands = new Uint16Array(27).fill(0x1ff);
    const counts = {};
    let emptyMask = (1 << 27) - 1;
    let broken = false;
    let maxTier = 0;
    let score = 0;

    function place(i, d) {
        if (grid[i] !== 0) { if (grid[i] !== d) broken = true; return; }
        const bit = 1 << (d - 1);
        if (!(cands[i] & bit)) { broken = true; return; }
        grid[i] = d; cands[i] = 0; emptyMask &= ~(1 << i);
        let m = L.seeMask[i];
        while (m) { const j = 31 - Math.clz32(m & -m); m &= m - 1; cands[j] &= ~bit; }
    }
    function restrict(i, keep) {
        if (grid[i] !== 0) return false;
        const nm = cands[i] & keep;
        if (nm === cands[i]) return false;
        cands[i] = nm;
        if (!nm) broken = true;
        return true;
    }
    function credit(name, tier, weight) {
        counts[name] = (counts[name] || 0) + 1;
        score += weight;
        if (tier > maxTier) maxTier = tier;
        return true;
    }
    function cageState(cage) {
        let rem = cage.sum, used = 0;
        const empt = [];
        for (const i of cage.cells) {
            const v = grid[i];
            if (v) {
                const bit = 1 << (v - 1);
                if (used & bit) broken = true;
                used |= bit; rem -= v;
            } else empt.push(i);
        }
        return { rem, used, empt };
    }

    if (initialClues) {
        for (let i = 0; i < 27; i++) {
            const v = initialClues[Math.floor(i / 9)][Math.floor(i / 3) % 3][i % 3];
            if (v) place(i, v);
        }
    }
    if (broken) return finish(false);

    // ── Tier 0 ──────────────────────────────────────────────────────
    function nakedSingles() {
        let hit = false;
        for (let i = 0; i < 27; i++) {
            if (grid[i]) continue;
            const m = cands[i];
            if (!m) { broken = true; return false; }
            if (!(m & (m - 1))) { place(i, 31 - Math.clz32(m) + 1); hit = credit('nakedSingle', 0, 1); }
        }
        return hit;
    }
    function cageLastCell() {
        let hit = false;
        for (const cage of L.cages) {
            const { rem, empt } = cageState(cage);
            if (empt.length === 0) { if (rem !== 0) broken = true; continue; }
            if (empt.length === 1) {
                if (rem < 1 || rem > 9) { broken = true; return false; }
                place(empt[0], rem);
                hit = credit('cageLastCell', 0, 1);
            }
        }
        return hit;
    }

    // ── Hidden singles in any group of planes ───────────────────────
    function hiddenSingles(from, to, name, tier, weight) {
        for (let p = from; p < to; p++) {
            const cells = G.planeCells[p];
            let placed = 0;
            for (const i of cells) if (grid[i]) placed |= 1 << (grid[i] - 1);
            for (let d = 1; d <= 9; d++) {
                const bit = 1 << (d - 1);
                if (placed & bit) continue;
                let n = 0, at = -1;
                for (const i of cells) if (cands[i] & bit) { n++; at = i; }
                if (n === 0) { broken = true; return false; }
                if (n === 1) { place(at, d); return credit(name, tier, weight); }
            }
        }
        return false;
    }

    // ── Cage combinations ───────────────────────────────────────────
    function cageCombos(filter, name, tier, weight) {
        let hit = false;
        for (const cage of L.cages) {
            const { rem, used, empt } = cageState(cage);
            if (!filter(cage, empt)) continue;
            const res = evaluateCageAssignments(empt.map(i => cands[i] & ~used), rem);
            if (!res.valid) { broken = true; return false; }
            let changed = false;
            empt.forEach((i, k) => { if (restrict(i, res.allowedMasks[k])) changed = true; });
            if (changed) hit = credit(name, tier, weight);
            if (broken) return false;
        }
        return hit;
    }
    function magicCages() {
        let hit = false;
        for (const cage of L.cages) {
            const table = MAGIC_CAGE_MASKS[cage.cells.length];
            const magic = table && table[cage.sum];
            if (!magic) continue;
            let changed = false;
            for (const i of cage.cells) if (restrict(i, magic)) changed = true;
            if (changed) hit = credit('magicCage', 1, 3);
            if (broken) return false;
        }
        return hit;
    }

    /* Forced digit d of a cage (in every valid combination): if only one cell can hold it,
       place it; otherwise remove d from every outside cell that sees all of its slots. */
    function cageForcedDigits() {
        for (const cage of L.cages) {
            const { rem, used, empt } = cageState(cage);
            if (empt.length < 2) continue;
            const res = evaluateCageAssignments(empt.map(i => cands[i] & ~used), rem);
            if (!res.valid) { broken = true; return false; }
            let forced = res.forcedMask;
            while (forced) {
                const bit = forced & -forced; forced ^= bit;
                const d = 31 - Math.clz32(bit) + 1;
                const slots = empt.filter(i => cands[i] & bit);
                if (slots.length === 0) { broken = true; return false; }
                if (slots.length === 1) { place(slots[0], d); return credit('cageHiddenSingle', 2, 4); }
                let seesAll = (1 << 27) - 1;
                for (const s of slots) seesAll &= L.seeMask[s];
                seesAll &= emptyMask & ~cage.mask;
                let hit = false;
                while (seesAll) {
                    const j = 31 - Math.clz32(seesAll & -seesAll); seesAll &= seesAll - 1;
                    if (restrict(j, ~bit)) hit = true;
                }
                if (hit) return credit('cagePointing', 2, 6);
            }
        }
        return false;
    }

    /* Plane–line claiming: digit confined to one line L = P ∩ Q inside plane P → clear Q \ L. */
    function planeClaiming() {
        for (let p = 0; p < 9; p++) {
            const axis = Math.floor(p / 3), k = p % 3;
            for (let d = 1; d <= 9; d++) {
                const bit = 1 << (d - 1);
                const withD = G.planeCells[p].filter(i => cands[i] & bit);
                if (withD.length < 2) continue;
                for (let b = 0; b < 3; b++) {
                    if (b === axis) continue;
                    const v = G.coords[withD[0]][b];
                    if (!withD.every(i => G.coords[i][b] === v)) continue;
                    let hit = false;
                    for (const j of G.planeCells[3 * b + v]) {
                        if (G.coords[j][axis] !== k && restrict(j, ~bit)) hit = true;
                    }
                    if (hit) return credit('planeClaiming', 2, 6);
                }
            }
        }
        return false;
    }

    function nakedSubset(size, tier, weight) {
        for (let p = 0; p < 9; p++) {
            const empt = G.planeCells[p].filter(i => !grid[i]);
            if (empt.length <= size) continue;
            const chosen = [];
            const pick = (start, union) => {
                if (chosen.length === size) {
                    if (popcount9(union) !== size) return false;
                    let hit = false;
                    for (const j of empt) if (!chosen.includes(j) && restrict(j, ~union)) hit = true;
                    return hit;
                }
                for (let s = start; s < empt.length; s++) {
                    const u = union | cands[empt[s]];
                    if (popcount9(u) > size) continue;
                    chosen.push(empt[s]);
                    const r = pick(s + 1, u);
                    chosen.pop();
                    if (r) return true;
                }
                return false;
            };
            if (pick(0, 0)) return credit(size === 2 ? 'nakedPair' : 'nakedTriple', tier, weight);
        }
        return false;
    }
    function hiddenSubset(size, tier, weight) {
        for (let p = 0; p < 9; p++) {
            const empt = G.planeCells[p].filter(i => !grid[i]);
            if (empt.length <= size) continue;
            const where = [], free = [];
            for (let d = 1; d <= 9; d++) {
                let m = 0;
                empt.forEach((i, pos) => { if (cands[i] & (1 << (d - 1))) m |= 1 << pos; });
                if (m) { where[d] = m; free.push(d); }
            }
            const digits = [];
            const pick = (start, posUnion) => {
                if (digits.length === size) {
                    if (popcount9(posUnion) !== size) return false;
                    let keep = 0; for (const d of digits) keep |= 1 << (d - 1);
                    let hit = false;
                    empt.forEach((i, pos) => { if (((posUnion >> pos) & 1) && restrict(i, keep)) hit = true; });
                    return hit;
                }
                for (let s = start; s < free.length; s++) {
                    const u = posUnion | where[free[s]];
                    if (popcount9(u) > size) continue;
                    digits.push(free[s]);
                    const r = pick(s + 1, u);
                    digits.pop();
                    if (r) return true;
                }
                return false;
            };
            if (pick(0, 0)) return credit(size === 2 ? 'hiddenPair' : 'hiddenTriple', tier, weight);
        }
        return false;
    }

    /* Generic innie/outie equation: sum(inn) - sum(out) = delta over ≤ maxUnknowns empty cells.
       Enumerates every assignment consistent with candidates and must-differ pairs (peers or
       cage-mates) and keeps only the digits that appear in some assignment. */
    function applyEquation(eq, minUnknowns, maxUnknowns) {
        const unknownMask = (eq.inn | eq.out) & emptyMask;
        const u = popcount27(unknownMask);
        if (u < minUnknowns || u > maxUnknowns) return false;
        let delta = eq.delta;
        let filled = (eq.inn | eq.out) & ~emptyMask;
        while (filled) {
            const j = 31 - Math.clz32(filled & -filled); filled &= filled - 1;
            delta += ((eq.inn >> j) & 1) ? -grid[j] : grid[j];
        }
        const cells = [], sign = [];
        let m = unknownMask;
        while (m) { const j = 31 - Math.clz32(m & -m); m &= m - 1; cells.push(j); sign.push(((eq.inn >> j) & 1) ? 1 : -1); }
        if (u === 0) { if (delta !== 0) broken = true; return false; }

        const allowed = new Array(u).fill(0);
        const val = new Array(u).fill(0);
        const dfs = (k, acc) => {
            if (k === u) {
                if (acc === delta) for (let t = 0; t < u; t++) allowed[t] |= 1 << (val[t] - 1);
                return;
            }
            let avail = cands[cells[k]];
            while (avail) {
                const bit = avail & -avail; avail ^= bit;
                const d = 31 - Math.clz32(bit) + 1;
                let clash = false;
                for (let t = 0; t < k; t++) {
                    if (val[t] === d && ((L.seeMask[cells[k]] >> cells[t]) & 1)) { clash = true; break; }
                }
                if (clash) continue;
                val[k] = d;
                dfs(k + 1, acc + sign[k] * d);
            }
        };
        dfs(0, 0);
        let hit = false;
        for (let t = 0; t < u; t++) {
            if (!allowed[t]) { broken = true; return false; }
            if (restrict(cells[t], allowed[t])) hit = true;
        }
        return hit;
    }
    function regionRule(eqLists, minU, maxU, name, tier, weight) {
        for (const list of eqLists) {
            for (const eq of list) {
                if (applyEquation(eq, minU, maxU)) return credit(name, tier, weight);
                if (broken) return false;
            }
        }
        return false;
    }

    function xyWing(tier, weight) {
        for (let pv = 0; pv < 27; pv++) {
            if (grid[pv] || popcount9(cands[pv]) !== 2) continue;
            const pm = cands[pv];
            const wings = [];
            let sm = L.seeMask[pv] & emptyMask;
            while (sm) {
                const j = 31 - Math.clz32(sm & -sm); sm &= sm - 1;
                if (popcount9(cands[j]) === 2 && popcount9(cands[j] & pm) === 1) wings.push(j);
            }
            for (let a = 0; a < wings.length; a++) for (let b = a + 1; b < wings.length; b++) {
                const A = wings[a], B = wings[b];
                if ((cands[A] & pm) === (cands[B] & pm)) continue;
                const zA = cands[A] & ~pm;
                if (zA !== (cands[B] & ~pm)) continue;
                let targets = L.seeMask[A] & L.seeMask[B] & emptyMask & ~(1 << pv);
                let hit = false;
                while (targets) {
                    const t = 31 - Math.clz32(targets & -targets); targets &= targets - 1;
                    if (restrict(t, ~zA)) hit = true;
                }
                if (hit) return credit('xyWing', tier, weight);
            }
        }
        return false;
    }
    function xyzWing(tier, weight) {
        for (let pv = 0; pv < 27; pv++) {
            if (grid[pv] || popcount9(cands[pv]) !== 3) continue;
            const pm = cands[pv];
            const wings = [];
            let sm = L.seeMask[pv] & emptyMask;
            while (sm) {
                const j = 31 - Math.clz32(sm & -sm); sm &= sm - 1;
                if (popcount9(cands[j]) === 2 && !(cands[j] & ~pm)) wings.push(j);
            }
            for (let a = 0; a < wings.length; a++) for (let b = a + 1; b < wings.length; b++) {
                const A = wings[a], B = wings[b];
                const zb = cands[A] & cands[B];
                if (popcount9(zb) !== 1 || (cands[A] | cands[B]) !== pm) continue;
                let targets = L.seeMask[A] & L.seeMask[B] & L.seeMask[pv] & emptyMask;
                let hit = false;
                while (targets) {
                    const t = 31 - Math.clz32(targets & -targets); targets &= targets - 1;
                    if (restrict(t, ~zb)) hit = true;
                }
                if (hit) return credit('xyzWing', tier, weight);
            }
        }
        return false;
    }

    /* Pattern overlay: each digit occupies one of 36 transversals (one cell per z, distinct y,
       distinct x). A candidate on no surviving transversal is impossible. This is the sound
       replacement for the old in-plane "X-Wing" (lines inside a plane are not houses). */
    function digitTemplates(tier, weight) {
        for (let d = 1; d <= 9; d++) {
            const bit = 1 << (d - 1);
            let cover = 0, valid = 0;
            for (const T of G.transversals) {
                if ((grid[T[0]] === d || (cands[T[0]] & bit)) &&
                    (grid[T[1]] === d || (cands[T[1]] & bit)) &&
                    (grid[T[2]] === d || (cands[T[2]] & bit))) {
                    valid++;
                    cover |= (1 << T[0]) | (1 << T[1]) | (1 << T[2]);
                }
            }
            if (!valid) { broken = true; return false; }
            let off = emptyMask & ~cover, hit = false;
            while (off) {
                const j = 31 - Math.clz32(off & -off); off &= off - 1;
                if (restrict(j, ~bit)) hit = true;
            }
            if (hit) return credit('digitTemplate', tier, weight);
        }
        return false;
    }

    const ladder = [
        [0, nakedSingles],
        [0, cageLastCell],
        [1, () => hiddenSingles(0, 3, 'hiddenSingleSlice', 1, 2)],
        [1, () => cageCombos((c, e) => e.length === 2, 'cageCombo2', 1, 3)],
        [1, magicCages],
        [2, () => hiddenSingles(3, 9, 'hiddenSingleDepth', 2, 4)],
        [2, () => cageCombos((c, e) => e.length >= 3, 'cageComboN', 2, 5)],
        [2, cageForcedDigits],
        [2, planeClaiming],
        [2, () => nakedSubset(2, 2, 6)],
        [2, () => hiddenSubset(2, 2, 7)],
        [3, () => regionRule(L.eq45, 1, 1, 'rule45Single', 3, 14)],
        [3, () => regionRule(L.eq45, 2, 2, 'rule45Pair', 3, 12)],
        [3, () => nakedSubset(3, 3, 10)],
        [3, () => hiddenSubset(3, 3, 11)],
        [3, () => xyWing(3, 14)],
        [4, () => regionRule(L.eq90, 1, 2, 'rule90', 4, 22)],
        [4, () => regionRule(L.eq45, 3, 3, 'rule45Triple', 4, 22)],
        [4, () => regionRule(L.eq90, 3, 3, 'rule90Triple', 4, 24)],
        [4, () => xyzWing(4, 18)],
        [4, () => digitTemplates(4, 26)]
    ];

    for (;;) {
        let progressed = false;
        for (const [tier, technique] of ladder) {
            if (tier > maxAllowedTier) break;
            if (technique()) { progressed = true; break; }
            if (broken) break;
        }
        if (broken || !progressed) break;
    }
    return finish(!broken && emptyMask === 0);

    function finish(solved) {
        const g3 = emptyGrid(), c3 = emptyGrid();
        for (let i = 0; i < 27; i++) {
            g3[Math.floor(i / 9)][Math.floor(i / 3) % 3][i % 3] = grid[i];
            c3[Math.floor(i / 9)][Math.floor(i / 3) % 3][i % 3] = cands[i];
        }
        return { solved, valid: !broken, maxTier, score, grid: g3, cands: c3, counts };
    }
}

function yieldToMain() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

function buildCageMap(cages) {
    const map = emptyGrid();
    for (const cage of cages) {
        for (const cell of cage.cells) map[cell.z][cell.y][cell.x] = cage;
    }
    return map;
}

/* Bump when grading rules change; cached boards from older generators are discarded. */
const KILLER_GEN_VERSION = 2;

const DIFFICULTY_SPECS = {
    casual:   { initialClues: 7, maxClues: 9, minTier: 0, maxTier: 0, minScore: 10,  maxScore: 40  },
    easy:     { initialClues: 4, maxClues: 5, minTier: 1, maxTier: 1, minScore: 25,  maxScore: 80  },
    medium:   { initialClues: 2, maxClues: 3, minTier: 2, maxTier: 2, minScore: 50,  maxScore: 140 },
    hard:     { initialClues: 0, maxClues: 1, minTier: 3, maxTier: 3, minScore: 80,  maxScore: 220 },
    fiendish: { initialClues: 0, maxClues: 0, minTier: 4, maxTier: 4, minScore: 110, maxScore: 999 }
};

function formatGeneratedCagesAndClues(solvedGrid, rawCages, targetDiff) {
    const spec = DIFFICULTY_SPECS[targetDiff] || DIFFICULTY_SPECS.medium;
    const actualCages = [];
    const forcedClues = [];

    for (const cage of rawCages) {
        if (cage.cells.length === 1) forcedClues.push(cage.cells[0]);
        else actualCages.push(cage);
    }
    actualCages.forEach((cage, k) => {
        cage.id = k;
        cage.colorIndex = k % CAGE_COLORS.length;
        cage.color = CAGE_COLORS[cage.colorIndex];
    });

    const initialG = emptyGrid();
    const clues = [];
    for (const c of forcedClues) {
        initialG[c.z][c.y][c.x] = solvedGrid[c.z][c.y][c.x];
        clues.push(`${c.z},${c.y},${c.x}`);
    }

    const extraNeeded = spec.initialClues - forcedClues.length;
    if (extraNeeded > 0) {
        const allCells = [];
        for (let z = 0; z < 3; z++)
            for (let y = 0; y < 3; y++)
                for (let x = 0; x < 3; x++)
                    if (!initialG[z][y][x]) allCells.push({ z, y, x });
        shuffleArray(allCells);
        for (let i = 0; i < extraNeeded && i < allCells.length; i++) {
            const c = allCells[i];
            initialG[c.z][c.y][c.x] = solvedGrid[c.z][c.y][c.x];
            clues.push(`${c.z},${c.y},${c.x}`);
        }
    }

    return { actualCages, initialG, clues };
}

function copyGrid(grid) {
    return grid.map(z => z.map(y => [...y]));
}

function countFilled(grid3) {
    let n = 0;
    for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (grid3[z][y][x]) n++;
    return n;
}

function gridsEqual(a, b) {
    for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (a[z][y][x] !== b[z][y][x]) return false;
    return true;
}

/**
 * Chooses the next given to reveal when the capped solver stalls.
 * With `ctx` ({ cages, solvedGrid, maxTier, spec, clueCount }) it looks ahead: each candidate given is
 * tried, a reveal that finishes the solve with the best difficulty fit wins, otherwise the reveal
 * that unlocks the most progress. Without `ctx` it falls back to the cell with the MOST candidates
 * (the old fewest-candidates rule revealed ~1 bit per given and wasted the clue budget).
 */
function pickBottleneckCell(logicState, currentInitialG, ctx = null) {
    const open = [];
    for (let z = 0; z < 3; z++)
        for (let y = 0; y < 3; y++)
            for (let x = 0; x < 3; x++)
                if (logicState.grid[z][y][x] === 0 && currentInitialG[z][y][x] === 0) {
                    open.push({ z, y, x, n: logicState.cands ? popcount9(logicState.cands[z][y][x]) : 9 });
                }
    if (!open.length) return null;
    shuffleArray(open);
    open.sort((a, b) => b.n - a.n);
    if (!ctx) return { z: open[0].z, y: open[0].y, x: open[0].x };

    const sample = open.slice(0, 10);
    let best = null, bestKey = -Infinity;
    for (const c of sample) {
        const trial = copyGrid(currentInitialG);
        trial[c.z][c.y][c.x] = ctx.solvedGrid[c.z][c.y][c.x];
        const res = solveLogically(ctx.cages, trial, ctx.maxTier);
        const key = res.solved
            ? 1e6 - scoreDifficultyFit(res, ctx.clueCount + 1, ctx.spec)
            : countFilled(res.grid) * 100 + res.score;
        if (key > bestKey) { bestKey = key; best = c; }
    }
    return { z: best.z, y: best.y, x: best.x };
}

function scoreDifficultyFit(logic, clueCount, spec) {
    let penalty = 0;
    if (!logic.solved) penalty += 5000;
    if (clueCount > spec.maxClues) penalty += (clueCount - spec.maxClues) * 500;
    if (logic.maxTier < spec.minTier) penalty += (spec.minTier - logic.maxTier) * 300;
    if (logic.maxTier > spec.maxTier) penalty += (logic.maxTier - spec.maxTier) * 300;
    if (logic.score < spec.minScore) penalty += (spec.minScore - logic.score) * 3;
    if (logic.score > spec.maxScore) penalty += (logic.score - spec.maxScore) * 3;
    return penalty;
}

/* Grades a decoded/shared puzzle by the hardest technique it needs (then score/clues). */
function inferKillerDifficulty(decoded) {
    const logic = solveLogically(decoded.cages, decoded.initialGrid, 4);
    if (!logic.solved) return 'fiendish';
    const clueCount = decoded.clues.length;
    let bestDiff = currentDifficulty;
    let bestPenalty = Infinity;
    for (const [diff, spec] of Object.entries(DIFFICULTY_SPECS)) {
        const penalty = scoreDifficultyFit(logic, clueCount, spec);
        if (penalty < bestPenalty) { bestPenalty = penalty; bestDiff = diff; }
    }
    return bestDiff;
}

/* If a solved board is too easy for its tier, drop givens that the capped solver does not need. */
function pruneRedundantClues(cages, initialG, clues, solvedGrid, spec) {
    let logic = solveLogically(cages, initialG, spec.maxTier);
    let penalty = scoreDifficultyFit(logic, clues.length, spec);
    for (const key of shuffleArray([...clues])) {
        if (penalty === 0) break;
        const [z, y, x] = key.split(',').map(Number);
        initialG[z][y][x] = 0;
        const trial = solveLogically(cages, initialG, spec.maxTier);
        const trialPenalty = scoreDifficultyFit(trial, clues.length - 1, spec);
        if (trial.solved && trialPenalty < penalty) {
            clues.splice(clues.indexOf(key), 1);
            logic = trial; penalty = trialPenalty;
        } else {
            initialG[z][y][x] = solvedGrid[z][y][x];
        }
    }
    return logic;
}

async function generateGame(targetDiff = currentDifficulty) {
    const spec = DIFFICULTY_SPECS[targetDiff] || DIFFICULTY_SPECS.medium;
    let bestPuzzle = null;
    let bestPenalty = Infinity;

    const maxAttempts = 400;
    const start = performance.now();
    const deadline = start + (targetDiff === 'fiendish' ? 900 : 600);
    const hardStop = start + 4000;

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        if (attempts > 0 && attempts % 6 === 0) {
            await yieldToMain();
            const now = performance.now();
            if ((bestPuzzle && now > deadline) || now > hardStop) break;
        }

        const grid = emptyGrid();
        generateSolvedGrid(grid, 3, 'standard');
        let { actualCages, initialG, clues } = formatGeneratedCagesAndClues(grid, generateCages(grid, targetDiff), targetDiff);
        if (clues.length > spec.maxClues) continue;

        let logic = solveLogically(actualCages, initialG, spec.maxTier);
        let splits = 0;

        /* Repair loop: reveal the most useful given while budget allows, otherwise split a stuck cage. */
        while (!logic.solved) {
            if (clues.length < spec.maxClues) {
                const target = pickBottleneckCell(logic, initialG, {
                    cages: actualCages, solvedGrid: grid, maxTier: spec.maxTier, spec, clueCount: clues.length
                });
                if (!target) break;
                initialG[target.z][target.y][target.x] = grid[target.z][target.y][target.x];
                clues.push(`${target.z},${target.y},${target.x}`);
            } else if (splits < 2) {
                const split = splitStuckCage(actualCages, logic, grid);
                if (!split) break;
                actualCages = split;
                splits++;
            } else break;
            logic = solveLogically(actualCages, initialG, spec.maxTier);
        }
        if (!logic.solved || !gridsEqual(logic.grid, grid)) continue;

        let penalty = scoreDifficultyFit(logic, clues.length, spec);
        if (penalty > 0 && (logic.maxTier < spec.minTier || logic.score < spec.minScore)) {
            logic = pruneRedundantClues(actualCages, initialG, clues, grid, spec);
            penalty = scoreDifficultyFit(logic, clues.length, spec);
        }

        if (penalty < bestPenalty) {
            bestPenalty = penalty;
            bestPuzzle = {
                clues: [...clues],
                initialGrid: copyGrid(initialG),
                solvedGrid: grid,
                cages: actualCages,
                map: buildCageMap(actualCages),
                gen: KILLER_GEN_VERSION
            };
            if (penalty === 0) break;
        }
    }

    if (bestPuzzle) return bestPuzzle;

    /* Guaranteed-solvable fallback: reveal givens (capped tier) until the logic solver finishes. */
    console.warn(`Could not strictly match ${targetDiff} profile within budget. Generating guaranteed ${targetDiff}-capped grid.`);
    for (;;) {
        const fbGrid = emptyGrid();
        generateSolvedGrid(fbGrid, 3, 'standard');
        const fbData = formatGeneratedCagesAndClues(fbGrid, generateCages(fbGrid, targetDiff), targetDiff);
        let fbLogic = solveLogically(fbData.actualCages, fbData.initialG, spec.maxTier);
        while (!fbLogic.solved) {
            const target = pickBottleneckCell(fbLogic, fbData.initialG);
            if (!target) break;
            fbData.initialG[target.z][target.y][target.x] = fbGrid[target.z][target.y][target.x];
            fbData.clues.push(`${target.z},${target.y},${target.x}`);
            fbLogic = solveLogically(fbData.actualCages, fbData.initialG, spec.maxTier);
        }
        if (!fbLogic.solved || !gridsEqual(fbLogic.grid, fbGrid)) continue;
        return {
            clues: fbData.clues,
            initialGrid: fbData.initialG,
            solvedGrid: fbGrid,
            cages: fbData.actualCages,
            map: buildCageMap(fbData.actualCages),
            gen: KILLER_GEN_VERSION
        };
    }
}

// ---------------------------------------------------------
// BACKGROUND CACHING SYSTEM
// ---------------------------------------------------------
let boardCache = { casual: [], easy: [], medium: [], hard: [], fiendish: [] };
let isCaching = false;

function saveCache() {
    localStorage.setItem('cubiku_killer_cache_v3', JSON.stringify(boardCache));
}

function loadCache() {
    localStorage.removeItem('cubiku_killer_cache');
    localStorage.removeItem('cubiku_killer_cache_v2');
    const saved = localStorage.getItem('cubiku_killer_cache_v3');
    if (saved) {
        try { 
            boardCache = JSON.parse(saved); 
            if (!boardCache.casual) boardCache.casual = [];
            if (!boardCache.easy) boardCache.easy = [];
            if (!boardCache.medium) boardCache.medium = [];
            if (!boardCache.hard) boardCache.hard = [];
            if (!boardCache.fiendish) boardCache.fiendish = [];
            /* Boards graded by the pre-v2 solver (unsound in-plane X-Wing) may be mis-tiered or non-unique. */
            for (const diff of Object.keys(boardCache)) {
                boardCache[diff] = Array.isArray(boardCache[diff])
                    ? boardCache[diff].filter(p => p && p.gen === KILLER_GEN_VERSION)
                    : [];
            }
        } catch(e) { 
            boardCache = { casual: [], easy: [], medium: [], hard: [], fiendish: [] }; 
        }
    }
}

async function maintainCache() {
    if (isCaching) return;
    isCaching = true;
    const diffs = ['casual', 'easy', 'medium', 'hard', 'fiendish'];
    
    for (const diff of diffs) {
        const targetCount = diff === 'fiendish' ? 1 : 2;
        while (boardCache[diff].length < targetCount) {
            console.log(`[Cache] Generating backup for ${diff}...`);
            const puzzle = await generateGame(diff);
            boardCache[diff].push(puzzle);
            saveCache();
            console.log(`[Cache] Cached ${diff}. Total: ${boardCache[diff].length}`);
            await yieldToMain(); 
        }
    }
    isCaching = false;
}

// ---------------------------------------------------------
// DOM & GAME STATE
// ---------------------------------------------------------
function check3SSC(grid, n = 3, variant = currentVariant) {
  const conflicts = new Set();
  const addConflict = (z, y, x) => conflicts.add(`${z},${y},${x}`);

  for (let z = 0; z < n; z++) {
      for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) {
              const v = grid[z][y][x];
              if (typeof v !== 'number' || v < 1 || v > 9) {
                  return { valid: false, message: "Some cells are still empty or contain invalid values.", conflicts: [] };
              }
          }
      }
  }

  for (let z = 0; z < n; z++) {
      const seen = {};
      for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) {
              const num = grid[z][y][x];
              if (!seen[num]) seen[num] = [];
              seen[num].push({ y, x });
          }
      }
      for (const num in seen) {
          if (seen[num].length > 1) seen[num].forEach(({ y, x }) => addConflict(z, y, x));
      }
  }

  for (let y = 0; y < n; y++) {
      const seen = {};
      for (let z = 0; z < n; z++) {
          for (let x = 0; x < n; x++) {
              const num = grid[z][y][x];
              if (!seen[num]) seen[num] = [];
              seen[num].push({ z, x });
          }
      }
      for (const num in seen) {
          if (seen[num].length > 1) seen[num].forEach(({ z, x }) => addConflict(z, y, x));
      }
  }

  for (let x = 0; x < n; x++) {
      const seen = {};
      for (let z = 0; z < n; z++) {
          for (let y = 0; y < n; y++) {
              const num = grid[z][y][x];
              if (!seen[num]) seen[num] = [];
              seen[num].push({ z, y });
          }
      }
      for (const num in seen) {
          if (seen[num].length > 1) seen[num].forEach(({ z, y }) => addConflict(z, y, x));
      }
  }

  if (variant === 'killer' && currentCages.length > 0) {
      for (const cage of currentCages) {
          let currentSum = 0;
          const cageSeen = new Set();
          for (const {z, y, x} of cage.cells) {
              const num = grid[z][y][x];
              currentSum += num;
              if (cageSeen.has(num)) {
                  cage.cells.forEach(c => addConflict(c.z, c.y, c.x));
              }
              cageSeen.add(num);
          }
          if (currentSum !== cage.sum) {
              cage.cells.forEach(c => addConflict(c.z, c.y, c.x));
          }
      }
  }

  if (conflicts.size > 0) {
      return {
          valid: false,
          message: "Constraints violated — conflicting cells highlighted.",
          conflicts: Array.from(conflicts).map(c => c.split(',').map(Number))
      };
  }
  return { valid: true, message: "Puzzle solved correctly! 🎉", conflicts: [] };
}

function emptyGrid() {
  return Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => Array(3).fill(0)));
}
function emptyDrafts() {
  return Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => new Set())));
}

let state           = emptyGrid();  
let drafts          = emptyDrafts();
let initialGrid     = emptyGrid(); 
let solvedGrid      = null;
let clueSet         = new Set();          
let selected        = null;             
let selectedCells   = new Set();
let isDragSelecting = false;
let dragStartKey    = null;
let undoStack       = [];

let activeNumber = null;
let inspectedNumber = null;
let currentDifficulty = "casual";
let currentTheme = "gold";
let currentColorMode = "light";
let stickyKeysEnabled = false; 
let pencilMode = false;
let isGameComplete = false; 
let isSharedPuzzle = false;
let isGeneratingNewGame = false;

let stats = {
  casual:   { wins: 0, bestTime: null, totalTime: 0, lastTime: null },
  easy:     { wins: 0, bestTime: null, totalTime: 0, lastTime: null },
  medium:   { wins: 0, bestTime: null, totalTime: 0, lastTime: null },
  hard:     { wins: 0, bestTime: null, totalTime: 0, lastTime: null },
  fiendish: { wins: 0, bestTime: null, totalTime: 0, lastTime: null }
};

const THEME_LABELS = {
  dark:  { cyan: 'Cyan', lavender: 'Lavender', rose: 'Rose',    gold: 'Gold',  silver: 'Silver' },
  light: { cyan: 'Teal', lavender: 'Violet',   rose: 'Crimson', gold: 'Amber', silver: 'Slate' }
};

function syncThemeOptionLabels() {
  const themeSelect = document.getElementById('theme-select');
  if (!themeSelect) return;
  const labels = THEME_LABELS[currentColorMode] || THEME_LABELS.dark;
  Array.from(themeSelect.options).forEach(opt => {
    if (labels[opt.value]) opt.textContent = labels[opt.value];
  });
}

function applyColorMode(mode) {
  currentColorMode = mode === 'dark' ? 'dark' : 'light';
  document.body.setAttribute('data-mode', currentColorMode);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', currentColorMode === 'light' ? '#FFFFFF' : '#121212');
  }

  const darkToggle = document.getElementById('toggle-dark-mode');
  if (darkToggle) darkToggle.checked = currentColorMode === 'dark';

  syncThemeOptionLabels();
}

function savePreferences() {
  localStorage.setItem('cubiku_killer_prefs_v3', JSON.stringify({
    theme: currentTheme,
    mode: currentColorMode,
    sticky: stickyKeysEnabled,
    difficulty: currentDifficulty
  }));
}

function loadPreferences() {
  const savedPrefs = localStorage.getItem('cubiku_killer_prefs_v3');
  if (savedPrefs) {
    try {
      const prefs = JSON.parse(savedPrefs);
      currentTheme = prefs.theme || "gold";
      currentColorMode = prefs.mode || "light";
      stickyKeysEnabled = !!prefs.sticky;
      currentDifficulty = prefs.difficulty || "casual";
    } catch(e) {}
  }

  const urlParams = new URLSearchParams(window.location.search);
  let syncedFromUrl = false;

  if (urlParams.has('mode')) {
    const m = urlParams.get('mode');
    if (m === 'light' || m === 'dark') {
      currentColorMode = m;
      syncedFromUrl = true;
    }
  }
  if (urlParams.has('theme')) {
    const t = urlParams.get('theme');
    if (['cyan', 'lavender', 'rose', 'gold', 'silver'].includes(t)) {
      currentTheme = t;
      syncedFromUrl = true;
    }
  }
  if (urlParams.has('sticky')) {
    stickyKeysEnabled = urlParams.get('sticky') === '1';
    syncedFromUrl = true;
  }

  document.body.setAttribute('data-theme', currentTheme);
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) themeSelect.value = currentTheme;

  const stickyToggle = document.getElementById('toggle-sticky-keys');
  if (stickyToggle) stickyToggle.checked = stickyKeysEnabled;

  const diffSelect = document.getElementById('difficulty-select');
  if (diffSelect) diffSelect.value = currentDifficulty;

  applyColorMode(currentColorMode);

  if (syncedFromUrl) {
    savePreferences();
    urlParams.delete('mode');
    urlParams.delete('theme');
    urlParams.delete('sticky');
    const remaining = urlParams.toString();
    const cleanUrl = remaining ? `${window.location.pathname}?${remaining}` : window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
  }
}

function saveStats() {
  localStorage.setItem('cubiku_killer_stats_v2', JSON.stringify(stats));
  updateStatsUI();
}

function loadStats() {
  const savedStats = localStorage.getItem('cubiku_killer_stats_v2');
  if (savedStats) {
    try { 
        const loaded = JSON.parse(savedStats);
        stats = { ...stats, ...loaded };
        if (!stats.casual) stats.casual = { wins: 0, bestTime: null, totalTime: 0, lastTime: null };
        if (!stats.fiendish) stats.fiendish = { wins: 0, bestTime: null, totalTime: 0, lastTime: null };
    } catch(e) {}
  } 
  updateStatsUI();
}

function resetStats() {
  const diff = currentDifficulty;
  if (confirm(`Are you sure you want to erase your statistics for ${diff} mode? This cannot be undone.`)) {
    stats[diff] = { wins: 0, bestTime: null, totalTime: 0, lastTime: null };
    saveStats();
    showMessage(`Statistics reset.`, "info");
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) settingsPanel.style.display = 'none';
  }
}

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return "--:--";
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

function updateStatsUI() {
  const currentStats = stats[currentDifficulty] || stats['casual'];
  const elWins = document.getElementById('stat-wins');
  if (elWins) elWins.textContent = currentStats.wins;
  const elBest = document.getElementById('stat-best');
  if (elBest) elBest.textContent = formatTime(currentStats.bestTime);
  const elAvg = document.getElementById('stat-avg');
  if (elAvg) {
    const avg = currentStats.wins > 0 ? Math.floor(currentStats.totalTime / currentStats.wins) : null;
    elAvg.textContent = formatTime(avg);
  }
  const elLast = document.getElementById('stat-last');
  if (elLast) elLast.textContent = formatTime(currentStats.lastTime);
}

function saveGame() {
  if (clueSet.size === 0 && currentCages.length === 0) return; 
  if (tutorialActive) return;
  
  const saveData = {
    state,
    drafts: drafts.map(zLevel => zLevel.map(row => row.map(cellSet => Array.from(cellSet)))),
    initialGrid,
    solvedGrid,
    clues: Array.from(clueSet),
    cages: currentCages,
    difficulty: currentDifficulty,
    timer: timerSeconds,
    isSharedPuzzle
  };
  localStorage.setItem('cubiku_killer_save', JSON.stringify(saveData));
}

function clearSave() { localStorage.removeItem('cubiku_killer_save'); }

function applyPuzzleData(puzzle, messageText = 'Game resumed.') {
  const { clues, initialGrid: initG, solvedGrid: solved, cages, map } = puzzle;

  state = emptyGrid();
  initialGrid = initG || emptyGrid();
  for (let z = 0; z < 3; z++) {
      for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 3; x++) {
              state[z][y][x] = initialGrid[z][y][x];
          }
      }
  }

  drafts = emptyDrafts();
  clueSet = new Set(clues);
  undoStack = [];
  timerSeconds = 0;
  solvedGrid = solved || null;
  currentCages = cages || [];
  cageMap = map || buildCageMap(currentCages);
  isGameComplete = false;
  pencilMode = false;
  activeNumber = null;
  inspectedNumber = null;

  document.querySelectorAll('.key-btn').forEach(btn => btn.classList.remove('control-disabled'));
  updateKeyboardUI();
  renderState();
  updateDepletion();
  startTimer();
  saveGame();
  if (messageText) showMessage(messageText, 'info');
}

function loadGame() {
  const saved = localStorage.getItem('cubiku_killer_save');
  if (!saved) return false;
  
  try {
    const data = JSON.parse(saved);
    state = data.state;
    
    if (data.drafts) {
        drafts = data.drafts.map(zLevel => zLevel.map(row => row.map(cellArray => new Set(cellArray))));
    } else {
        drafts = emptyDrafts();
    }

    initialGrid = data.initialGrid || emptyGrid();
    solvedGrid = data.solvedGrid || null;
    clueSet = new Set(data.clues);
    currentCages = data.cages || [];
    currentDifficulty = data.difficulty || "casual";
    isSharedPuzzle = !!data.isSharedPuzzle;
    
    cageMap = emptyGrid();
    for (const cage of currentCages) {
        for (const cell of cage.cells) cageMap[cell.z][cell.y][cell.x] = cage;
    }

    timerSeconds = data.timer || 0;
    undoStack = [];
    isGameComplete = false; 
    pencilMode = false;
    activeNumber = null;
    inspectedNumber = null;
    
    document.querySelectorAll('.key-btn').forEach(btn => btn.classList.remove('control-disabled'));
    const diffSelect = document.getElementById('difficulty-select');
    if (diffSelect) diffSelect.value = currentDifficulty;

    updateStatsUI(); 
    renderState();
    updateDepletion();
    startTimer(); 
    showMessage('Game resumed.', 'info');
    return true;
  } catch (e) {
    clearSave();
    return false;
  }
}

let timerSeconds  = 0;
let timerInterval = null;

function startTimer() {
  if (isGameComplete || tutorialActive) return;
  stopTimer();
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
    saveGame();
  }, 1000);
}
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  if (!display) return;
  if (zenMode) {
    display.textContent = '--:--';
    return;
  }
  display.textContent = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(Math.floor(timerSeconds % 60)).padStart(2, '0')}`;
}

let zenMode = false;
function toggleZen() {
  zenMode = !zenMode;
  const timerBar = document.getElementById('timer-bar');
  if (timerBar) {
    timerBar.classList.toggle('zen', zenMode);
    timerBar.setAttribute('aria-pressed', String(zenMode));
    timerBar.title = zenMode ? 'Tap to show timer' : 'Tap to hide timer';
  }
  updateTimerDisplay();
}

let shareFeedbackTimer = null;
async function sharePuzzle() {
  if (tutorialActive || currentCages.length === 0) return;

  try {
    const encoded = encodeKillerPuzzle(currentCages, initialGrid, clueSet);
    const shareUrl = `${window.location.origin}${window.location.pathname}?k=${encoded}&d=${encodeURIComponent(currentDifficulty)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
    } else {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    const btnShare = document.getElementById('btn-share');
    const iconShare = document.getElementById('icon-share');
    const iconCheck = document.getElementById('icon-share-check');
    if (btnShare) btnShare.classList.add('copied');
    if (iconShare) iconShare.style.display = 'none';
    if (iconCheck) iconCheck.style.display = '';

    clearTimeout(shareFeedbackTimer);
    shareFeedbackTimer = setTimeout(() => {
      if (btnShare) btnShare.classList.remove('copied');
      if (iconShare) iconShare.style.display = '';
      if (iconCheck) iconCheck.style.display = 'none';
    }, 1600);

    showMessage('Puzzle link copied!', 'info');
  } catch (err) {
    showMessage('Could not copy puzzle link.', 'error');
  }
}

function toggleMenu() {
  const panel = document.getElementById('settings-panel');
  if (panel) panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'flex' : 'none';
}

function cellId(z, row, col) { return `cell-${z}-${row}-${col}`; }
function getCell(z, row, col) { return document.getElementById(cellId(z, row, col)); }

function showMessage(text, type = 'info') {
  const bar = document.getElementById('message-bar');
  if (!bar) return;
  bar.textContent = text;
  bar.className   = `message-bar ${type}`;
}

function hideMessage() {
  const bar = document.getElementById('message-bar');
  if (bar) bar.className = 'message-bar hidden';
}

function clearHighlights() {
  document.querySelectorAll('.cell.active-cell, .cell.multi-selected, .cell.constraint-highlight, .cell.cage-highlight, .cell.tutorial-highlight')
    .forEach(el => el.classList.remove('active-cell', 'multi-selected', 'constraint-highlight', 'cage-highlight', 'tutorial-highlight'));
}

function applyCrosshair(selZ, selRow, selCol) {
  if (tutorialActive) return;

  const activeEl = getCell(selZ, selRow, selCol);
  if (activeEl) activeEl.classList.add('active-cell');

  if (selectedCells.size > 1) {
    for (const key of selectedCells) {
      const [mz, mr, mc] = key.split(',').map(Number);
      const el = getCell(mz, mr, mc);
      if (el) el.classList.add('multi-selected');
    }
    return;
  }

  if (cageMap && cageMap[selZ] && cageMap[selZ][selRow] && cageMap[selZ][selRow][selCol]) {
    const cage = cageMap[selZ][selRow][selCol];
    for (const c of cage.cells) {
      const el = getCell(c.z, c.y, c.x);
      if (el) el.classList.add('cage-highlight');
    }
  }
}

function renderSelection() {
  if (tutorialActive) return;
  clearHighlights();
  if (!selected) return;
  applyCrosshair(selected.z, selected.row, selected.col);
  updateNumberHighlights();
}

function selectCell(z, row, col) {
  if (tutorialActive) return;
  inspectedNumber = null;
  selectedCells.clear();
  if (clueSet.has(`${z},${row},${col}`)) {
    selected = null;
    clearHighlights();
    applyCrosshair(z, row, col);
    updateNumberHighlights();
  } else {
    selected = { z, row, col };
    selectedCells.add(`${z},${row},${col}`);
    renderSelection();
  }
}

function toggleCellSelection(z, row, col) {
  if (tutorialActive || clueSet.has(`${z},${row},${col}`)) return;
  inspectedNumber = null;
  const key = `${z},${row},${col}`;

  if (selectedCells.has(key)) {
    selectedCells.delete(key);
    if (selectedCells.size === 0) {
      selected = null;
      clearHighlights();
      updateNumberHighlights();
      return;
    }
    if (selected && selected.z === z && selected.row === row && selected.col === col) {
      const lastKey = Array.from(selectedCells).pop();
      const [lz, lr, lc] = lastKey.split(',').map(Number);
      selected = { z: lz, row: lr, col: lc };
    }
  } else {
    selectedCells.add(key);
    selected = { z, row, col };
  }
  renderSelection();
}

function selectRangeTo(z, row, col) {
  if (tutorialActive) return;
  inspectedNumber = null;
  if (!selected) {
    selectCell(z, row, col);
    return;
  }
  const zMin = Math.min(selected.z, z), zMax = Math.max(selected.z, z);
  const rMin = Math.min(selected.row, row), rMax = Math.max(selected.row, row);
  const cMin = Math.min(selected.col, col), cMax = Math.max(selected.col, col);

  for (let iz = zMin; iz <= zMax; iz++) {
    for (let ir = rMin; ir <= rMax; ir++) {
      for (let ic = cMin; ic <= cMax; ic++) {
        const key = `${iz},${ir},${ic}`;
        if (!clueSet.has(key)) selectedCells.add(key);
      }
    }
  }
  if (!clueSet.has(`${z},${row},${col}`)) {
    selected = { z, row, col };
  }
  renderSelection();
}

function clearSelection() {
  clearHighlights();
  selected = null;
  selectedCells.clear();
  inspectedNumber = null;
  updateNumberHighlights();
}

function updateNumberHighlights() {
  document.querySelectorAll('.cell').forEach(el => el.classList.remove('number-highlight'));
  if(tutorialActive) return;

  const targetVal = activeNumber !== null && activeNumber !== 'erase' && activeNumber !== 'undo' && activeNumber !== 'pencil' 
                    ? Number(activeNumber) : (inspectedNumber !== null ? Number(inspectedNumber) : null);
  if (targetVal === null) return;

  for (let z = 0; z < 3; z++) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (state[z][r][c] === targetVal) {
          const el = getCell(z, r, c);
          if (el) el.classList.add('number-highlight');
        }
      }
    }
  }
}

function updateKeyboardUI() {
  document.body.classList.toggle('pencil-mode-active', pencilMode);
  document.querySelectorAll('.key-btn').forEach(b => {
    const val = b.dataset.val;
    if (val === 'pencil') { b.classList.toggle('active', pencilMode); return; }
    if (val === activeNumber) b.classList.add('active'); else b.classList.remove('active');
    b.style.transform = ''; b.style.fontWeight = ''; b.style.border = '';
  });
}

function buildGrids() {
  for (let z = 0; z < 3; z++) {
    const container = document.getElementById(`grid-z${z}`);
    if (!container) continue;
    container.innerHTML = '';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cell = document.createElement('div');
        cell.id          = cellId(z, row, col);
        cell.className   = 'cell';
        cell.dataset.z   = z;
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.tabIndex    = 0;
        cell.setAttribute('aria-label', `Slice z=${z} row ${row + 1} col ${col + 1}`);

        const cageSumSpan = document.createElement('span');
        cageSumSpan.className = 'cage-sum';
        cell.appendChild(cageSumSpan);

        const mainVal = document.createElement('span');
        mainVal.className = 'main-value';
        cell.appendChild(mainVal);

        for (let i = 1; i <= 9; i++) {
            const cand = document.createElement('span');
            cand.className = `candidate cand-${i}`;
            cand.textContent = i;
            cell.appendChild(cand);
        }

        cell.addEventListener('focus', onCellFocus);
        cell.addEventListener('keydown', onCellKeydown);
        cell.addEventListener('pointerdown', onCellPointerDown);
        container.appendChild(cell);
      }
    }
  }
}

function renderState() {
  for (let z = 0; z < 3; z++) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const el = getCell(z, row, col);
        if (!el) continue;
        const isClue = clueSet.has(`${z},${row},${col}`);
        const val = state[z][row][col];
        const cellDrafts = drafts[z][row][col];

        el.tabIndex = isClue ? -1 : 0;
        el.classList.toggle('clue', isClue);
        el.classList.remove('conflict', 'flash-conflict');

        const mainValSpan = el.querySelector('.main-value');
        const cageSumSpan = el.querySelector('.cage-sum');
        
        if (cageMap && cageMap[z][row][col]) {
            const cage = cageMap[z][row][col];
            el.style.backgroundColor = getCageBackground(cage);
            if (cage.cells[0].z === z && cage.cells[0].y === row && cage.cells[0].x === col) {
                cageSumSpan.textContent = cage.sum;
            } else { cageSumSpan.textContent = ''; }
        } else {
            el.style.backgroundColor = '';
            cageSumSpan.textContent = '';
        }
        
        for (let i = 1; i <= 9; i++) {
            const cand = el.querySelector(`.cand-${i}`);
            if (cand) { cand.style.display = 'none'; cand.classList.remove('visible'); }
        }
        
        if (val > 0) {
            el.classList.remove('draft-mode');
            if (mainValSpan) mainValSpan.textContent = val;
        } else {
            if (mainValSpan) mainValSpan.textContent = '';
            if (cellDrafts && cellDrafts.size > 0) {
                el.classList.add('draft-mode');
                for (const digit of cellDrafts) {
                    const cand = el.querySelector(`.cand-${digit}`);
                    if (cand) { cand.style.display = 'block'; cand.classList.add('visible'); }
                }
            } else {
                el.classList.remove('draft-mode');
            }
        }
      }
    }
  }
  updateNumberHighlights();
}

function setLoading(on) {
  document.querySelectorAll('.grid').forEach(g => g.classList.toggle('loading', on));
  const newGameBtn = document.getElementById('btn-new-game');
  if (newGameBtn) newGameBtn.disabled = on;
}

function undoLastAction() {
  if (isGameComplete || undoStack.length === 0 || tutorialActive) return;
  const action = undoStack.pop();

  if (action.type === 'auto_draft_clear') {
      action.cells.forEach(({z: az, r: ar, c: ac}) => { drafts[az][ar][ac].add(action.digit); });
      undoLastAction();
      return; 
  }

  if (action.type === 'batch') {
      for (let i = action.items.length - 1; i >= 0; i--) {
          const item = action.items[i];
          const el = getCell(item.z, item.row, item.col);
          if (item.type === 'draft') drafts[item.z][item.row][item.col] = item.before;
          else if (item.type === 'value') {
              state[item.z][item.row][item.col] = item.before;
              if (item.beforeDrafts) drafts[item.z][item.row][item.col] = item.beforeDrafts;
          } else if (item.type === 'clear') {
              state[item.z][item.row][item.col] = item.beforeVal;
              drafts[item.z][item.row][item.col] = item.beforeDrafts;
          }
          if (el) el.classList.remove('conflict', 'flash-conflict');
      }
      updateDepletion(); saveGame(); renderState(); renderSelection(); checkAutoComplete();
      return;
  }

  const el = getCell(action.z, action.row, action.col);
  if (!el) return;

  if (action.type === 'draft') drafts[action.z][action.row][action.col] = action.before;
  else if (action.type === 'value') {
      state[action.z][action.row][action.col] = action.before;
      if (action.beforeDrafts) drafts[action.z][action.row][action.col] = action.beforeDrafts;
  } else if (action.type === 'clear') {
      state[action.z][action.row][action.col] = action.beforeVal;
      drafts[action.z][action.row][action.col] = action.beforeDrafts;
  } else state[action.z][action.row][action.col] = action.before;

  el.classList.remove('conflict', 'flash-conflict');
  updateDepletion(); saveGame(); renderState(); renderSelection(); checkAutoComplete();
}

function removeDraftFromPeers(z, row, col, digit) {
    const affected = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if ((i !== row || j !== col) && drafts[z][i][j].has(digit)) affected.push({z, r: i, c: j});
            if ((i !== z || j !== col) && drafts[i][row][j].has(digit)) affected.push({z: i, r: row, c: j});
            if ((i !== z || j !== row) && drafts[i][j][col].has(digit)) affected.push({z: i, r: j, c: col});
        }
    }
    if (currentVariant === 'killer' && cageMap && cageMap[z][row][col]) {
        for (const c of cageMap[z][row][col].cells) {
            if ((c.z !== z || c.y !== row || c.x !== col) && drafts[c.z][c.y][c.x].has(digit)) {
                affected.push({z: c.z, r: c.y, c: c.x});
            }
        }
    }
    
    const uniqueAffected = []; const seen = new Set();
    for (const cell of affected) {
        const key = `${cell.z},${cell.r},${cell.c}`;
        if (!seen.has(key)) { seen.add(key); uniqueAffected.push(cell); }
    }
    if (uniqueAffected.length > 0) {
        undoStack.push({ type: 'auto_draft_clear', digit, cells: uniqueAffected });
        uniqueAffected.forEach(({z: az, r: ar, c: ac}) => drafts[az][ar][ac].delete(digit));
    }
}

function fillCell(z, row, col, digitStr) {
  if (isGameComplete || clueSet.has(`${z},${row},${col}`) || tutorialActive) return;
  const el = getCell(z, row, col); if (!el) return;
  const digit = digitStr ? Number(digitStr) : 0;
  const beforeVal = state[z][row][col];
  const beforeDrafts = new Set(drafts[z][row][col]);

  if (digitStr === '') {
      if (beforeVal === 0 && beforeDrafts.size === 0) return;
      undoStack.push({ type: 'clear', z, row, col, beforeVal, beforeDrafts });
      state[z][row][col] = 0; drafts[z][row][col].clear();
      hideMessage(); updateDepletion(); saveGame(); renderState(); return;
  }

  if (pencilMode) {
      if (state[z][row][col] !== 0) return; 
      undoStack.push({ type: 'draft', z, row, col, before: beforeDrafts });
      if (drafts[z][row][col].has(digit)) drafts[z][row][col].delete(digit); else drafts[z][row][col].add(digit);
      saveGame(); renderState(); return;
  }

  if (beforeVal === digit) return;

  undoStack.push({ type: 'value', z, row, col, before: beforeVal, beforeDrafts: beforeDrafts });
  state[z][row][col] = digit;
  
  if (digit > 0) {
      drafts[z][row][col].clear();
      removeDraftFromPeers(z, row, col, digit);
      flashConflicts(z, row, col, digit);
  }

  hideMessage(); updateDepletion(); saveGame(); renderState(); checkAutoComplete();
}

function applyToSelection(digitStr) {
  if (isGameComplete || tutorialActive || selectedCells.size === 0) return;

  const targets = Array.from(selectedCells)
    .map(k => k.split(',').map(Number))
    .filter(([z, row, col]) => !clueSet.has(`${z},${row},${col}`));

  if (targets.length === 0) return;

  if (targets.length === 1) {
    const [z, row, col] = targets[0];
    fillCell(z, row, col, digitStr);
    return;
  }

  const batchItems = [];

  if (digitStr === '') {
    for (const [z, row, col] of targets) {
      const beforeVal = state[z][row][col];
      const beforeDrafts = new Set(drafts[z][row][col]);
      if (beforeVal !== 0 || beforeDrafts.size > 0) {
        batchItems.push({ type: 'clear', z, row, col, beforeVal, beforeDrafts });
        state[z][row][col] = 0;
        drafts[z][row][col].clear();
      }
    }
    if (batchItems.length > 0) {
      undoStack.push({ type: 'batch', items: batchItems });
      hideMessage();
      updateDepletion();
      saveGame();
      renderState();
    }
    return;
  }

  if (!pencilMode) {
    showMessage("Enable Pencil to enter candidates.", "info");
    return;
  }

  const digit = Number(digitStr);
  const emptyTargets = targets.filter(([z, row, col]) => state[z][row][col] === 0);
  if (emptyTargets.length === 0) return;
  const allHaveDigit = emptyTargets.every(([z, row, col]) => drafts[z][row][col].has(digit));

  for (const [z, row, col] of emptyTargets) {
    const beforeDrafts = new Set(drafts[z][row][col]);
    if (allHaveDigit) {
      drafts[z][row][col].delete(digit);
      batchItems.push({ type: 'draft', z, row, col, before: beforeDrafts });
    } else if (!drafts[z][row][col].has(digit)) {
      drafts[z][row][col].add(digit);
      batchItems.push({ type: 'draft', z, row, col, before: beforeDrafts });
    }
  }
  if (batchItems.length > 0) {
    undoStack.push({ type: 'batch', items: batchItems });
    saveGame();
    renderState();
  }
}

function updateDepletion() {
  const counts = Array(10).fill(0);
  for (let z = 0; z < 3; z++) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const val = state[z][r][c]; if (val > 0) counts[val]++;
  }

  let activeWasDepleted = false;
  document.querySelectorAll('.key-btn').forEach(btn => {
    const valStr = btn.dataset.val;
    if (!valStr || ['erase', 'undo', 'pencil'].includes(valStr)) {
       if (btn) { btn.style.opacity = '1'; btn.style.textDecoration = 'none'; btn.classList.remove('depleted'); }
       return; 
    }
    const val = Number(valStr);
    if (counts[val] >= 3) {
      btn.style.opacity = '0.3';
      btn.style.textDecoration = 'line-through';
      btn.classList.add('depleted');
      btn.classList.remove('active');
      if (activeNumber === String(val)) activeWasDepleted = true;
    } else {
      btn.style.opacity = '1';
      btn.style.textDecoration = 'none';
      btn.classList.remove('depleted');
    }
  });

  if (activeWasDepleted) {
    activeNumber = null; updateKeyboardUI(); clearSelection();
    if (document.activeElement && document.activeElement.classList.contains('cell')) document.activeElement.blur();
    updateNumberHighlights();
  }
}

function checkAutoComplete() {
  let emptyCount = 0;
  for (let z = 0; z < 3; z++) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (state[z][r][c] === 0) emptyCount++;
  if (emptyCount === 0) checkSolution(); 
}

function flashConflicts(z, row, col, value) {
  if (!value) return;
  const clashEls = [];
  /* All 18 geometric peers (three planes), not just the 6 line-mates. */
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if ((i !== row || j !== col) && state[z][i][j] === value) clashEls.push(getCell(z, i, j));
      if ((i !== z || j !== col) && state[i][row][j] === value) clashEls.push(getCell(i, row, j));
      if ((i !== z || j !== row) && state[i][j][col] === value) clashEls.push(getCell(i, j, col));
    }
  }
  
  if (currentVariant === 'killer' && cageMap && cageMap[z][row][col]) {
      for (const c of cageMap[z][row][col].cells) {
          if (c.z !== z || c.y !== row || c.x !== col) {
              if (state[c.z][c.y][c.x] === value) clashEls.push(getCell(c.z, c.y, c.x));
          }
      }
  }

  clashEls.forEach(el => {
    if(!el) return;
    el.classList.remove('flash-conflict'); void el.offsetWidth; el.classList.add('flash-conflict');
    setTimeout(() => el.classList.remove('flash-conflict'), 1000);
  });
}

function onCellFocus(e) {
  if (tutorialActive || isDragSelecting) return;
  const el = e.currentTarget;
  const z = Number(el.dataset.z), row = Number(el.dataset.row), col = Number(el.dataset.col);
  if (clueSet.has(`${z},${row},${col}`)) {
    if (inspectedNumber === null) selectCell(z, row, col);
    return;
  }
  if (activeNumber === null && !selected && inspectedNumber === null) selectCell(z, row, col);
}

function onCellPointerDown(e) {
  e.preventDefault(); 
  if (tutorialActive) return;

  const el = e.currentTarget;
  const z = Number(el.dataset.z), row = Number(el.dataset.row), col = Number(el.dataset.col);
  const key = `${z},${row},${col}`;
  
  if (inspectedNumber !== null) { inspectedNumber = null; clearHighlights(); }

  if (clueSet.has(key)) {
    inspectedNumber = String(state[z][row][col]); activeNumber = null;
    selected = null; selectedCells.clear();
    updateKeyboardUI(); updateNumberHighlights(); clearHighlights(); applyCrosshair(z, row, col);
    el.focus();
    return;
  }

  if (activeNumber !== null) {
    if (activeNumber === 'erase') fillCell(z, row, col, ''); else fillCell(z, row, col, activeNumber);
    
    if (activeNumber === null) {
        clearSelection();
    } else if (!stickyKeysEnabled && !pencilMode) { 
        activeNumber = null; clearSelection(); 
    } else { 
        selectCell(z, row, col); 
    }
    
    updateKeyboardUI(); updateNumberHighlights();
    return;
  }

  if (e.shiftKey && selected) {
    selectRangeTo(z, row, col);
    el.focus();
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    toggleCellSelection(z, row, col);
    el.focus();
    return;
  }

  isDragSelecting = true;
  dragStartKey = key;
  selectCell(z, row, col);
  el.focus();
}

function handleGlobalPointerMove(e) {
  if (!isDragSelecting || tutorialActive) return;
  const target = document.elementFromPoint(e.clientX, e.clientY);
  const cellEl = target ? target.closest('.cell') : null;
  if (!cellEl) return;

  const z = Number(cellEl.dataset.z);
  const row = Number(cellEl.dataset.row);
  const col = Number(cellEl.dataset.col);
  const key = `${z},${row},${col}`;

  if (clueSet.has(key)) return;

  if (!selectedCells.has(key)) {
    selectedCells.add(key);
    selected = { z, row, col };
    renderSelection();
  }
}

function handleGlobalPointerUp() {
  if (!isDragSelecting) return;
  isDragSelecting = false;
  dragStartKey = null;
}

function getDigitFromKeyEvent(e) {
  if (/^[1-9]$/.test(e.key)) return e.key;
  if (e.code && /^Digit[1-9]$/.test(e.code)) return e.code.slice(5);
  if (e.code && /^Numpad[1-9]$/.test(e.code)) return e.code.slice(6);
  return null;
}

function onCellKeydown(e) {
  if (tutorialActive) return;
  const el = e.currentTarget; const z = Number(el.dataset.z), row = Number(el.dataset.row), col = Number(el.dataset.col);

  if (e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault();
    if (selectedCells.size > 0) {
      applyToSelection('');
      renderSelection();
    } else if (!clueSet.has(`${z},${row},${col}`)) {
      fillCell(z, row, col, '');
    }
    return;
  }
  const digitKey = !e.ctrlKey && !e.metaKey && !e.altKey ? getDigitFromKeyEvent(e) : null;
  if (digitKey) {
    e.preventDefault();
    const wasPencil = pencilMode;
    if (e.shiftKey) pencilMode = true;
    try {
      if (selectedCells.size > 0) {
        applyToSelection(digitKey);
        if (!stickyKeysEnabled && !pencilMode && selectedCells.size === 1) clearSelection();
        else renderSelection();
      } else if (!clueSet.has(`${z},${row},${col}`)) {
        fillCell(z, row, col, digitKey);
        if (!stickyKeysEnabled && !pencilMode) clearSelection();
      }
    } finally {
      if (e.shiftKey) pencilMode = wasPencil;
    }
    return;
  }
  if (e.key.toLowerCase() === 'p' || e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) { pencilMode = !pencilMode; updateKeyboardUI(); }
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoLastAction(); return; }
  if (e.key === 'Escape') { clearSelection(); el.blur(); return; }

  const moves = { ArrowRight: [z, row, (col + 1) % 3], ArrowLeft:  [z, row, (col + 2) % 3], ArrowDown:  [z, (row + 1) % 3, col], ArrowUp:    [z, (row + 2) % 3, col] };
  if (moves[e.key]) {
    e.preventDefault();
    const [nz, nr, nc] = moves[e.key];
    if (e.shiftKey && selected) selectRangeTo(nz, nr, nc);
    else selectCell(nz, nr, nc);
    getCell(nz, nr, nc)?.focus();
  }
}

function handleKeyboardTap(valStr) {
  if (!valStr || tutorialActive) return; 
  if (valStr === 'undo') { undoLastAction(); return; }
  inspectedNumber = null;
  if (valStr !== 'erase' && valStr !== 'pencil') {
    const btn = document.querySelector(`.key-btn[data-val="${valStr}"]`);
    if (btn && btn.classList.contains('depleted')) return;
  }

  if (selectedCells.size > 0 && selected !== null) {
    if (valStr === 'pencil') {
      pencilMode = !pencilMode;
      updateKeyboardUI();
      renderSelection();
      return;
    }

    const wasMulti = selectedCells.size > 1;
    if (valStr === 'erase') applyToSelection('');
    else applyToSelection(valStr);
    
    const btn = document.querySelector(`.key-btn[data-val="${valStr}"]`);
    if (btn && btn.classList.contains('depleted')) {
      activeNumber = null;
      clearSelection();
    } else if (!stickyKeysEnabled) {
      if (!pencilMode && !wasMulti) {
        activeNumber = null;
        clearSelection();
      } else {
        renderSelection();
      }
    } else {
      renderSelection();
    }
    
    updateKeyboardUI(); updateNumberHighlights();
  } else {
    clearHighlights();
    if (valStr === 'pencil') pencilMode = !pencilMode; else if (activeNumber === valStr) activeNumber = null; else activeNumber = valStr;
    updateKeyboardUI(); updateNumberHighlights();
  }
}

async function newGame() {
  if (isGeneratingNewGame) return;
  isGeneratingNewGame = true;
  if (tutorialActive) endTutorial();
  if (window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
  }
  isSharedPuzzle = false;
  setLoading(true); hideMessage(); stopTimer(); clearSave(); clearSelection(); isGameComplete = false; 
  pencilMode = false; activeNumber = null; inspectedNumber = null;
  
  document.querySelectorAll('.key-btn').forEach(btn => btn.classList.remove('control-disabled'));
  updateKeyboardUI(); drafts = emptyDrafts();

  try {
    let puzzle;
    
    if (boardCache[currentDifficulty] && boardCache[currentDifficulty].length > 0) {
        console.log(`[Cache] Loading ${currentDifficulty} from backup array.`);
        puzzle = boardCache[currentDifficulty].shift();
        saveCache(); 
    } else {
        console.log(`[Cache Miss] Generating ${currentDifficulty} on the fly...`);
        puzzle = await generateGame(currentDifficulty);
    }
    
    const greetings = [
      "Calculations ready.", "Focus.", "🖖", "It all adds up eventually.", 
      "Live long and deduce.", "Fascinating.", "Logic dictates.", "Stay sharp."
    ];
    applyPuzzleData(puzzle, greetings[Math.floor(Math.random() * greetings.length)]);
    
    setTimeout(maintainCache, 500);
    
  } catch (err) {
    showMessage(`Failed to load puzzle: ${err.message}`, 'error');
  } finally {
    setLoading(false);
    isGeneratingNewGame = false;
  }
}

async function checkSolution() {
  if (isGameComplete || tutorialActive) return; 
  hideMessage(); document.querySelectorAll('.cell.conflict').forEach(c => c.classList.remove('conflict'));

  try {
    const data = check3SSC(state, 3, currentVariant);
    if (data.valid) {
      isGameComplete = true; document.querySelectorAll('.key-btn').forEach(btn => btn.classList.add('control-disabled')); 
      stopTimer(); showMessage(data.message, 'success'); clearSelection(); clearSave(); 
      
      if (!isSharedPuzzle) {
        const diff = currentDifficulty;
        stats[diff].wins++; stats[diff].totalTime += timerSeconds; stats[diff].lastTime = timerSeconds;
        if (stats[diff].bestTime === null || timerSeconds < stats[diff].bestTime) stats[diff].bestTime = timerSeconds;
        saveStats();
      }
    } else {
      showMessage(data.message, 'error');
      if (!solvedGrid && typeof computeSolutionGrid === 'function') solvedGrid = computeSolutionGrid();
      if (Array.isArray(data.conflicts)) {
        data.conflicts.forEach(([z, row, col]) => {
          if (!clueSet.has(`${z},${row},${col}`) && (!solvedGrid || state[z][row][col] !== solvedGrid[z][row][col])) { getCell(z, row, col)?.classList.add('conflict'); }
        });
      }
    }
  } catch (err) { showMessage(`Could not check solution: ${err.message}`, 'error'); }
}

// ---------------------------------------------------------
// INTERACTIVE TUTORIAL
// ---------------------------------------------------------
let tutorialActive = false;
let tutorialBackup = null;
let tutorialStep = 0;

const tutorialSteps = [
    { 
        title: "Welcome to 3D", 
        text: "A standard Sudoku is 9x9. Killer Cubiku is a 3x3x3 cube, displayed as three flat depth slices (z = 0, z = 1, and z = 2).", 
        setup: () => { clearHighlights(); } 
    },
    { 
        title: "The Planes", 
        text: "Every 3x3 slice across all three dimensions (horizontal, vertical, and straight through the depth pillars) must contain the digits 1 through 9 exactly once.", 
        setup: () => { 
            clearHighlights(); 
            for(let i=0; i<3; i++) for(let j=0; j<3; j++) getCell(0, i, j).classList.add('tutorial-highlight');
        } 
    },
    { 
        title: "The Cages", 
        text: "The colored areas are Cages. Digits cannot repeat inside a single cage, and they must add up to the small target number in the top-left corner.", 
        setup: () => { 
            clearHighlights(); 
            getCell(0, 0, 0).classList.add('tutorial-highlight'); getCell(0, 0, 1).classList.add('tutorial-highlight');
        } 
    },
    { 
        title: "The Rule of 45", 
        text: "Because every 3x3 plane always contains exactly the digits 1-9, the total sum of the entire plane is ALWAYS 45. This is your secret weapon.", 
        setup: () => { 
            clearHighlights(); 
            for(let i=0; i<3; i++) for(let j=0; j<3; j++) getCell(1, i, j).classList.add('tutorial-highlight');
        } 
    },
    { 
        title: "Innies & Outies", 
        text: "By adding up cages that cover a plane, you can subtract the plane's total of 45 to deduce the values of cells hanging inside or outside the region. Good luck!", 
        setup: () => { clearHighlights(); } 
    }
];

function startTutorial() {
    if (tutorialActive) return;
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) settingsPanel.style.display = 'none';
    tutorialActive = true;
    
    tutorialBackup = {
        state: copyGrid(state),
        cages: currentCages,
        map: cageMap,
        clues: new Set(clueSet),
        timer: timerSeconds,
        drafts: drafts.map(zL => zL.map(r => r.map(c => new Set(c)))),
        wasComplete: isGameComplete,
        selected: selected ? { ...selected } : null,
        selectedCells: new Set(selectedCells),
        activeNumber,
        inspectedNumber,
        pencilMode
    };
    stopTimer();
    clearSelection();
    activeNumber = null;
    inspectedNumber = null;
    pencilMode = false;
    updateKeyboardUI();
    
    state = emptyGrid();
    drafts = emptyDrafts();
    clueSet = new Set();
    currentCages = [
        { id: 0, cells: [{z:0,y:0,x:0}, {z:0,y:0,x:1}], sum: 15, colorIndex: 0, color: CAGE_COLORS[0] },
        { id: 1, cells: [{z:1,y:1,x:1}, {z:1,y:1,x:2}], sum: 7,  colorIndex: 2, color: CAGE_COLORS[2] }
    ];
    cageMap = buildCageMap(currentCages);
    
    document.getElementById('tutorial-overlay').classList.remove('hidden');
    tutorialStep = 0;
    updateTutorialUI();
}

function updateTutorialUI() {
    const step = tutorialSteps[tutorialStep];
    document.getElementById('tutorial-title').textContent = step.title;
    document.getElementById('tutorial-text').textContent = step.text;
    
    const btnPrev = document.getElementById('btn-tut-prev');
    const btnNext = document.getElementById('btn-tut-next');
    
    btnPrev.style.visibility = tutorialStep === 0 ? 'hidden' : 'visible';
    btnNext.textContent = tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next';
    
    renderState();
    step.setup(); 
}

function nextTutorialStep() {
    if (tutorialStep < tutorialSteps.length - 1) {
        tutorialStep++; updateTutorialUI();
    } else {
        endTutorial();
    }
}

function prevTutorialStep() {
    if (tutorialStep > 0) { tutorialStep--; updateTutorialUI(); }
}

function endTutorial() {
    if (!tutorialActive) return;
    tutorialActive = false;
    document.getElementById('tutorial-overlay').classList.add('hidden');
    clearHighlights();
    
    if (tutorialBackup) {
        state = tutorialBackup.state;
        currentCages = tutorialBackup.cages;
        cageMap = tutorialBackup.map;
        clueSet = tutorialBackup.clues;
        timerSeconds = tutorialBackup.timer;
        drafts = tutorialBackup.drafts;
        isGameComplete = !!tutorialBackup.wasComplete;
        selected = tutorialBackup.selected;
        selectedCells = tutorialBackup.selectedCells || new Set();
        activeNumber = tutorialBackup.activeNumber ?? null;
        inspectedNumber = tutorialBackup.inspectedNumber ?? null;
        pencilMode = !!tutorialBackup.pencilMode;
        tutorialBackup = null;

        updateKeyboardUI();
        renderState();
        if (selected && !isGameComplete) {
            renderSelection();
        } else {
            updateNumberHighlights();
        }

        if (!isGameComplete) {
            startTimer();
        } else {
            updateTimerDisplay();
        }
    }
}

function repairDOM() {
    const pencilBtn = document.getElementById('btn-pencil');
    if (pencilBtn) {
        pencilBtn.removeAttribute('disabled'); pencilBtn.title = "Toggle Pencil Mode"; pencilBtn.className = 'key-btn';
        pencilBtn.dataset.val = 'pencil'; pencilBtn.style.setProperty('pointer-events', 'auto', 'important');
        pencilBtn.style.setProperty('cursor', 'pointer', 'important'); pencilBtn.style.setProperty('opacity', '1', 'important');
        pencilBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
    }
    document.querySelectorAll('.key-btn').forEach(btn => { btn.classList.remove('control-disabled', 'depleted'); btn.removeAttribute('disabled'); });
}

function init() {
  repairDOM(); buildGrids(); loadPreferences(); loadStats(); loadCache();
  
  const btnNew = document.getElementById('btn-new-game'); if (btnNew) btnNew.addEventListener('click', newGame);
  const btnMenu = document.getElementById('btn-menu'); if (btnMenu) btnMenu.addEventListener('click', toggleMenu);
  const btnShare = document.getElementById('btn-share'); if (btnShare) btnShare.addEventListener('click', sharePuzzle);
  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) btnRestart.addEventListener('click', () => {
      if (confirm("Are you sure you want to restart this puzzle from the beginning?")) {
          if (tutorialActive) endTutorial();
          for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) state[z][y][x] = initialGrid[z][y][x];
          undoStack = []; drafts = emptyDrafts(); isGameComplete = false; pencilMode = false; activeNumber = null; inspectedNumber = null;
          clearSelection();
          document.querySelectorAll('.key-btn').forEach(btn => btn.classList.remove('control-disabled'));
          updateKeyboardUI(); timerSeconds = 0; renderState(); updateDepletion(); startTimer(); saveGame(); showMessage("Puzzle restarted.", "info");
      }
  });

  const timerBar = document.getElementById('timer-bar');
  if (timerBar) {
    timerBar.addEventListener('click', toggleZen);
    timerBar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleZen();
      }
    });
  }
  const btnSettingsReset = document.getElementById('btn-settings-reset-stats'); if (btnSettingsReset) btnSettingsReset.addEventListener('click', (e) => { e.stopPropagation(); resetStats(); });
  const btnSettingsTut = document.getElementById('btn-settings-tutorial'); if (btnSettingsTut) btnSettingsTut.addEventListener('click', startTutorial);

  const toggleDark = document.getElementById('toggle-dark-mode'); if (toggleDark) toggleDark.addEventListener('change', (e) => {
      applyColorMode(e.target.checked ? 'dark' : 'light');
      savePreferences();
      renderState();
  });
  
  const themeSelect = document.getElementById('theme-select'); if (themeSelect) themeSelect.addEventListener('change', (e) => { 
      currentTheme = e.target.value; 
      document.body.setAttribute('data-theme', currentTheme);
      savePreferences(); 
  });
  
  const diffSelect = document.getElementById('difficulty-select'); if (diffSelect) diffSelect.addEventListener('change', (e) => { 
      currentDifficulty = e.target.value; 
      updateStatsUI(); 
      savePreferences(); 
      maintainCache();
  });

  const variantSelect = document.getElementById('variant-select');
  if (variantSelect) {
    variantSelect.value = 'killer';
    variantSelect.addEventListener('change', (e) => {
      if (e.target.value === 'standard') {
        const params = new URLSearchParams({
          mode: currentColorMode,
          theme: currentTheme,
          sticky: stickyKeysEnabled ? '1' : '0'
        });
        window.location.href = `${STANDARD_CUBIKU_URL}?${params.toString()}`;
      }
    });
  }

  window.addEventListener('pageshow', () => {
    const vs = document.getElementById('variant-select');
    if (vs) vs.value = 'killer';
  });
  
  const toggleSticky = document.getElementById('toggle-sticky-keys'); if (toggleSticky) toggleSticky.addEventListener('change', (e) => { stickyKeysEnabled = e.target.checked; savePreferences(); });

  /* Tutorial UI Hooks */
  document.getElementById('btn-tut-prev').addEventListener('click', prevTutorialStep);
  document.getElementById('btn-tut-next').addEventListener('click', nextTutorialStep);
  document.getElementById('btn-close-tutorial').addEventListener('click', endTutorial);

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoLastAction(); return; }
    if (!e.defaultPrevented && !tutorialActive && !isGameComplete && (e.key === ' ' || e.code === 'Space')) {
      const tag = e.target && e.target.tagName;
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (e.target && e.target.getAttribute && e.target.getAttribute('role') === 'button')) return;
      e.preventDefault();
      if (!e.repeat) { pencilMode = !pencilMode; updateKeyboardUI(); }
    }
  });
  document.querySelectorAll('.key-btn').forEach(btn => btn.addEventListener('click', (e) => handleKeyboardTap(e.currentTarget.dataset.val)));
  document.addEventListener('click', (e) => {
    const settingsPanel = document.getElementById('settings-panel'); const btnM = document.getElementById('btn-menu');
    if (settingsPanel && settingsPanel.style.display === 'flex') if (!settingsPanel.contains(e.target) && !btnM.contains(e.target)) settingsPanel.style.display = 'none';
  });

  document.addEventListener('pointermove', handleGlobalPointerMove);
  document.addEventListener('pointerup', handleGlobalPointerUp);
  document.addEventListener('pointercancel', handleGlobalPointerUp);

  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.slices-container') && !e.target.closest('.keyboard-container') && !e.target.closest('.top-action-bar') && !e.target.closest('.settings-panel') && !e.target.closest('.tutorial-overlay')) {
      activeNumber = null; updateKeyboardUI(); clearSelection();
      if (document.activeElement && document.activeElement.classList.contains('cell')) document.activeElement.blur();
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const sharedParam = urlParams.get('k');
  if (sharedParam) {
    const decoded = decodeKillerPuzzle(sharedParam);
    if (decoded) {
      const rawDiff = (urlParams.get('d') || urlParams.get('difficulty') || '').toLowerCase();
      currentDifficulty = DIFFICULTY_SPECS[rawDiff] ? rawDiff : inferKillerDifficulty(decoded);

      const diffSelectEl = document.getElementById('difficulty-select');
      if (diffSelectEl) diffSelectEl.value = currentDifficulty;
      updateStatsUI();
      savePreferences();

      isSharedPuzzle = true;
      applyPuzzleData(decoded, 'Shared puzzle loaded.');
      setTimeout(maintainCache, 1000);
      return;
    } else {
      window.history.replaceState({}, '', window.location.pathname);
      if (!loadGame()) newGame();
      else setTimeout(maintainCache, 1000);
      showMessage('Invalid puzzle link.', 'error');
      return;
    }
  }

  if (!loadGame()) newGame();
  else setTimeout(maintainCache, 1000); 
}

document.addEventListener('DOMContentLoaded', () => init());