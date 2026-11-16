/**
 * Cubiku Variants v118 — Killer 3D Sudoku (Multi-Cell Selection + Default Light Mode)
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

function generateCages(solvedGrid, difficulty = 'medium') {
    const cages = [];
    const unassigned = [];
    for (let z = 0; z < 3; z++)
        for (let y = 0; y < 3; y++)
            for (let x = 0; x < 3; x++)
                unassigned.push({ z, y, x });
    
    shuffleArray(unassigned);
    let cageId = 0;

    while (unassigned.length > 0) {
        const start = unassigned.pop();
        
        let targetSize;
        if (difficulty === 'casual') targetSize = Math.random() < 0.72 ? 2 : 3;
        else if (difficulty === 'easy') targetSize = Math.floor(Math.random() * 2) + 2;
        else if (difficulty === 'fiendish') targetSize = Math.random() < 0.65 ? 3 : 4;
        else if (difficulty === 'hard') targetSize = Math.floor(Math.random() * 2) + 3;
        else targetSize = Math.floor(Math.random() * 2) + 2;

        const cageCells = [start];
        let sum = solvedGrid[start.z][start.y][start.x];

        for (let i = 1; i < targetSize; i++) {
            const neighbors = [];
            for (const cell of cageCells) {
                const offsets = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
                for (const [dz, dy, dx] of offsets) {
                    const nz = cell.z + dz, ny = cell.y + dy, nx = cell.x + dx;
                    if (nz >= 0 && nz < 3 && ny >= 0 && ny < 3 && nx >= 0 && nx < 3) {
                        const idx = unassigned.findIndex(u => u.z === nz && u.y === ny && u.x === nx);
                        if (idx !== -1 && !neighbors.includes(idx)) {
                            const adjVal = solvedGrid[nz][ny][nx];
                            const hasDuplicate = cageCells.some(c => solvedGrid[c.z][c.y][c.x] === adjVal);
                            if (!hasDuplicate) neighbors.push(idx);
                        }
                    }
                }
            }
            if (neighbors.length > 0) {
                shuffleArray(neighbors);
                const chosenIdx = neighbors[0];
                const chosenCell = unassigned.splice(chosenIdx, 1)[0];
                cageCells.push(chosenCell);
                sum += solvedGrid[chosenCell.z][chosenCell.y][chosenCell.x];
            } else {
                break;
            }
        }
        
        if (cageCells.length === 1 && cages.length > 0) {
            const loneCell = cageCells[0];
            const loneVal = solvedGrid[loneCell.z][loneCell.y][loneCell.x];
            const offsets = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
            let merged = false;
            
            const maxSize = (difficulty === 'hard' || difficulty === 'fiendish')
                ? 4
                : ((difficulty === 'casual' || difficulty === 'easy') ? 3 : 4);
            
            for (const [dz, dy, dx] of offsets) {
                const nz = loneCell.z + dz, ny = loneCell.y + dy, nx = loneCell.x + dx;
                const adjCage = cages.find(c => c.cells.some(cell => cell.z === nz && cell.y === ny && cell.x === nx));
                if (adjCage && adjCage.cells.length < maxSize) {
                    const hasDuplicate = adjCage.cells.some(c => solvedGrid[c.z][c.y][c.x] === loneVal);
                    if (!hasDuplicate) {
                        adjCage.cells.push(loneCell);
                        adjCage.sum += loneVal;
                        merged = true;
                        break;
                    }
                }
            }
            if (!merged) {
                const colorIdx = cageId % CAGE_COLORS.length;
                cages.push({ id: cageId, cells: cageCells, sum: sum, colorIndex: colorIdx, color: CAGE_COLORS[colorIdx] });
                cageId++;
            }
        } else {
            const colorIdx = cageId % CAGE_COLORS.length;
            cages.push({ id: cageId, cells: cageCells, sum: sum, colorIndex: colorIdx, color: CAGE_COLORS[colorIdx] });
            cageId++;
        }
    }

    for (const cage of cages) {
        cage.cells.sort((a, b) => {
            if (a.z !== b.z) return a.z - b.z;
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        });
    }

    return cages;
}

// ---------------------------------------------------------
// PRECOMPUTED 3D CUBIKU GEOMETRY FOR HUMAN LOGIC SOLVER
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

const MAGIC_3_CELL_MASKS = {
    6:  (1 << 0) | (1 << 1) | (1 << 2), /* {1, 2, 3} */
    7:  (1 << 0) | (1 << 1) | (1 << 3), /* {1, 2, 4} */
    23: (1 << 5) | (1 << 7) | (1 << 8), /* {6, 8, 9} */
    24: (1 << 6) | (1 << 7) | (1 << 8)  /* {7, 8, 9} */
};

function popcount9(mask) {
    let c = 0, m = mask & 0x1ff;
    while (m) { m &= m - 1; c++; }
    return c;
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
        let lo = 10, hi = 0;
        const m = cellMasks[i];
        for (let d = 1; d <= 9; d++) {
            if (m & (1 << (d - 1))) {
                if (d < lo) lo = d;
                if (d > hi) hi = d;
            }
        }
        if (lo > hi) return { valid: false, allowedMasks, forcedMask: 0 };
        minRem[i] = minRem[i + 1] + lo;
        maxRem[i] = maxRem[i + 1] + hi;
    }

    const chosen = new Array(k).fill(0);

    function dfs(idx, usedMask, partialSum, comboMask) {
        if (idx === k) {
            if (partialSum === targetSum) {
                foundAny = true;
                forcedMask &= comboMask;
                for (let i = 0; i < k; i++) {
                    allowedMasks[i] |= (1 << (chosen[i] - 1));
                }
            }
            return;
        }
        if (partialSum + minRem[idx] > targetSum || partialSum + maxRem[idx] < targetSum) return;

        if (idx === k - 1) {
            const needed = targetSum - partialSum;
            if (needed >= 1 && needed <= 9) {
                const bit = 1 << (needed - 1);
                if (!(usedMask & bit) && (cellMasks[idx] & bit)) {
                    chosen[idx] = needed;
                    foundAny = true;
                    forcedMask &= (comboMask | bit);
                    for (let i = 0; i < k; i++) {
                        allowedMasks[i] |= (1 << (chosen[i] - 1));
                    }
                }
            }
            return;
        }

        const avail = cellMasks[idx] & ~usedMask;
        for (let d = 1; d <= 9; d++) {
            const bit = 1 << (d - 1);
            if (avail & bit) {
                chosen[idx] = d;
                dfs(idx + 1, usedMask | bit, partialSum + d, comboMask | bit);
            }
        }
    }

    dfs(0, 0, 0, 0);
    return { valid: foundAny, allowedMasks, forcedMask: foundAny ? forcedMask : 0 };
}

/**
 * Human-style forward-chaining logic solver capped at `maxAllowedTier`:
 * - Tier 0 (Casual):   Grid Naked Singles + Cage Last-Cell Singles (`sum - filled`)
 * - Tier 1 (Easy):     Flat z-slice Hidden Singles + 2-cell cage combos + unique 3-cell magic sums (6, 7, 23, 24)
 * - Tier 2 (Medium):   3D depth-plane Hidden Singles (x/y) + general 3/4-cell cage combos + pointing/claiming + pairs
 * - Tier 3 (Hard):     Planar Rule of 45 (single & dual innies/outies, 1-innie/1-outie deltas)
 * - Tier 4 (Fiendish): Volumetric Rule of 90 + 3-innie virtual cages + 3D Planar X-Wings
 */
function solveLogically(cagesTest, initialClues = null, maxAllowedTier = 4) {
    const grid = emptyGrid();
    const cands = emptyGrid();
    for (let z = 0; z < 3; z++)
        for (let y = 0; y < 3; y++)
            for (let x = 0; x < 3; x++)
                cands[z][y][x] = 0x1ff;

    const localCageMap = buildCageMap(cagesTest);
    const cellCageId = emptyGrid();
    for (let z = 0; z < 3; z++)
        for (let y = 0; y < 3; y++)
            for (let x = 0; x < 3; x++)
                cellCageId[z][y][x] = localCageMap[z][y][x] ? localCageMap[z][y][x].id : -1;

    function sharesPeerOrCage(a, b) {
        if (a.z === b.z || a.y === b.y || a.x === b.x) return true;
        const idA = cellCageId[a.z][a.y][a.x];
        return idA !== -1 && idA === cellCageId[b.z][b.y][b.x];
    }

    let progress = true;
    let maxTier = 0;
    let score = 0;

    function placeDigit(z, y, x, d) {
        if (grid[z][y][x] !== 0) return grid[z][y][x] === d;
        const bit = 1 << (d - 1);
        if (!(cands[z][y][x] & bit)) return false;

        grid[z][y][x] = d;
        cands[z][y][x] = 0;

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                cands[z][i][j] &= ~bit;
                cands[i][y][j] &= ~bit;
                cands[i][j][x] &= ~bit;
            }
        }
        const cage = localCageMap[z][y][x];
        if (cage) {
            for (const c of cage.cells) {
                if (c.z !== z || c.y !== y || c.x !== x) {
                    cands[c.z][c.y][c.x] &= ~bit;
                }
            }
        }
        return true;
    }

    if (initialClues) {
        for (let z = 0; z < 3; z++) {
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    if (initialClues[z][y][x] !== 0) {
                        if (!placeDigit(z, y, x, initialClues[z][y][x])) {
                            return { solved: false, maxTier: 0, score: 0, grid, cands };
                        }
                    }
                }
            }
        }
    }

    function hasContradiction() {
        for (let z = 0; z < 3; z++) {
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    if (grid[z][y][x] === 0 && cands[z][y][x] === 0) return true;
                }
            }
        }
        return false;
    }

    function applyHiddenSinglesOnPlanes(planesList, tierLevel, weight) {
        let localProgress = false;
        for (const plane of planesList) {
            let placedMask = 0;
            for (const c of plane.cells) {
                const v = grid[c.z][c.y][c.x];
                if (v > 0) placedMask |= (1 << (v - 1));
            }
            for (let d = 1; d <= 9; d++) {
                const bit = 1 << (d - 1);
                if (placedMask & bit) continue;
                let count = 0, targetCell = null;
                for (const c of plane.cells) {
                    if (grid[c.z][c.y][c.x] === 0 && (cands[c.z][c.y][c.x] & bit)) {
                        count++;
                        targetCell = c;
                    }
                }
                if (count === 0) return { contradiction: true, progress: false };
                if (count === 1) {
                    if (!placeDigit(targetCell.z, targetCell.y, targetCell.x, d)) {
                        return { contradiction: true, progress: false };
                    }
                    score += weight;
                    localProgress = true;
                }
            }
            if (localProgress) break;
        }
        if (localProgress) maxTier = Math.max(maxTier, tierLevel);
        return { contradiction: false, progress: localProgress };
    }

    function applyRegionSumDeductions(regionsList, tierLevel, singleWeight, pairWeight, allowThreeInnies) {
        let localProgress = false;

        for (const region of regionsList) {
            const intersectingCages = [];
            const regionStrs = new Set(region.cells.map(c => `${c.z},${c.y},${c.x}`));
            for (const cage of cagesTest) {
                if (cage.cells.some(c => regionStrs.has(`${c.z},${c.y},${c.x}`))) {
                    intersectingCages.push(cage);
                }
            }

            if (intersectingCages.length > 13) continue;

            const totalSubsets = 1 << intersectingCages.length;
            for (let i = 1; i < totalSubsets; i++) {
                let subSum = 0;
                const subStrs = new Set();
                const subCells = [];
                for (let j = 0; j < intersectingCages.length; j++) {
                    if (i & (1 << j)) {
                        subSum += intersectingCages[j].sum;
                        for (const c of intersectingCages[j].cells) {
                            subStrs.add(`${c.z},${c.y},${c.x}`);
                            subCells.push(c);
                        }
                    }
                }

                if (subSum < region.target - 24 || subSum > region.target + 24) continue;

                const innies = region.cells.filter(c => !subStrs.has(`${c.z},${c.y},${c.x}`));
                const outies = subCells.filter(c => !regionStrs.has(`${c.z},${c.y},${c.x}`));

                if (innies.length + outies.length > 3) continue;

                // 1. Single Innie
                if (innies.length === 1 && outies.length === 0) {
                    const val = region.target - subSum;
                    const c = innies[0];
                    if (val < 1 || val > 9) return { contradiction: true, progress: false };
                    if (grid[c.z][c.y][c.x] === 0) {
                        if (!placeDigit(c.z, c.y, c.x, val)) return { contradiction: true, progress: false };
                        score += singleWeight;
                        localProgress = true;
                        break;
                    }
                }
                // 2. Single Outie
                else if (outies.length === 1 && innies.length === 0) {
                    const val = subSum - region.target;
                    const c = outies[0];
                    if (val < 1 || val > 9) return { contradiction: true, progress: false };
                    if (grid[c.z][c.y][c.x] === 0) {
                        if (!placeDigit(c.z, c.y, c.x, val)) return { contradiction: true, progress: false };
                        score += singleWeight;
                        localProgress = true;
                        break;
                    }
                }
                // 3. Two Innies (or Two Outies) -> Virtual 2-cell sum
                else if ((innies.length === 2 && outies.length === 0) || (outies.length === 2 && innies.length === 0)) {
                    const pair = innies.length === 2 ? innies : outies;
                    let target = innies.length === 2 ? (region.target - subSum) : (subSum - region.target);
                    const emptyPair = [];
                    for (const c of pair) {
                        if (grid[c.z][c.y][c.x] !== 0) target -= grid[c.z][c.y][c.x];
                        else emptyPair.push(c);
                    }
                    if (emptyPair.length === 0) {
                        if (target !== 0) return { contradiction: true, progress: false };
                    } else if (emptyPair.length === 1) {
                        const c = emptyPair[0];
                        if (target < 1 || target > 9 || !placeDigit(c.z, c.y, c.x, target)) {
                            return { contradiction: true, progress: false };
                        }
                        score += singleWeight;
                        localProgress = true;
                        break;
                    } else if (emptyPair.length === 2) {
                        const [c0, c1] = emptyPair;
                        const mustDistinct = sharesPeerOrCage(c0, c1);
                        let m0 = 0, m1 = 0;
                        const cand0 = cands[c0.z][c0.y][c0.x];
                        const cand1 = cands[c1.z][c1.y][c1.x];
                        for (let d0 = 1; d0 <= 9; d0++) {
                            if (!(cand0 & (1 << (d0 - 1)))) continue;
                            const d1 = target - d0;
                            if (d1 < 1 || d1 > 9) continue;
                            if (mustDistinct && d0 === d1) continue;
                            if (cand1 & (1 << (d1 - 1))) {
                                m0 |= (1 << (d0 - 1));
                                m1 |= (1 << (d1 - 1));
                            }
                        }
                        if (m0 === 0 || m1 === 0) return { contradiction: true, progress: false };
                        const new0 = cand0 & m0;
                        const new1 = cand1 & m1;
                        if (new0 !== cand0 || new1 !== cand1) {
                            cands[c0.z][c0.y][c0.x] = new0;
                            cands[c1.z][c1.y][c1.x] = new1;
                            score += pairWeight;
                            localProgress = true;
                            break;
                        }
                    }
                }
                // 4. 1-Innie & 1-Outie: innie - outie = region.target - subSum
                else if (innies.length === 1 && outies.length === 1) {
                    const cIn = innies[0], cOut = outies[0];
                    const delta = region.target - subSum;
                    const vIn = grid[cIn.z][cIn.y][cIn.x];
                    const vOut = grid[cOut.z][cOut.y][cOut.x];

                    if (vIn !== 0 && vOut !== 0) {
                        if (vIn - vOut !== delta) return { contradiction: true, progress: false };
                    } else if (vIn !== 0) {
                        const reqOut = vIn - delta;
                        if (reqOut < 1 || reqOut > 9 || !placeDigit(cOut.z, cOut.y, cOut.x, reqOut)) {
                            return { contradiction: true, progress: false };
                        }
                        score += singleWeight;
                        localProgress = true;
                        break;
                    } else if (vOut !== 0) {
                        const reqIn = vOut + delta;
                        if (reqIn < 1 || reqIn > 9 || !placeDigit(cIn.z, cIn.y, cIn.x, reqIn)) {
                            return { contradiction: true, progress: false };
                        }
                        score += singleWeight;
                        localProgress = true;
                        break;
                    } else {
                        const mustDistinct = sharesPeerOrCage(cIn, cOut);
                        const candIn = cands[cIn.z][cIn.y][cIn.x];
                        const candOut = cands[cOut.z][cOut.y][cOut.x];
                        let mIn = 0, mOut = 0;
                        for (let dIn = 1; dIn <= 9; dIn++) {
                            if (!(candIn & (1 << (dIn - 1)))) continue;
                            const dOut = dIn - delta;
                            if (dOut < 1 || dOut > 9) continue;
                            if (mustDistinct && dIn === dOut) continue;
                            if (candOut & (1 << (dOut - 1))) {
                                mIn |= (1 << (dIn - 1));
                                mOut |= (1 << (dOut - 1));
                            }
                        }
                        if (mIn === 0 || mOut === 0) return { contradiction: true, progress: false };
                        const newIn = candIn & mIn;
                        const newOut = candOut & mOut;
                        if (newIn !== candIn || newOut !== candOut) {
                            cands[cIn.z][cIn.y][cIn.x] = newIn;
                            cands[cOut.z][cOut.y][cOut.x] = newOut;
                            score += pairWeight;
                            localProgress = true;
                            break;
                        }
                    }
                }
                // 5. Three Innies inside a single 45-plane -> Virtual 3-cell cage
                else if (allowThreeInnies && innies.length === 3 && outies.length === 0) {
                    let remTarget = region.target - subSum;
                    const emptyTri = [];
                    let usedBits = 0;
                    for (const c of innies) {
                        const v = grid[c.z][c.y][c.x];
                        if (v !== 0) {
                            remTarget -= v;
                            usedBits |= (1 << (v - 1));
                        } else {
                            emptyTri.push(c);
                        }
                    }
                    if (emptyTri.length >= 2) {
                        const triMasks = emptyTri.map(c => cands[c.z][c.y][c.x] & ~usedBits);
                        const evalRes = evaluateCageAssignments(triMasks, remTarget);
                        if (!evalRes.valid) return { contradiction: true, progress: false };
                        let changed = false;
                        for (let idx = 0; idx < emptyTri.length; idx++) {
                            const c = emptyTri[idx];
                            const oldM = cands[c.z][c.y][c.x];
                            const newM = oldM & evalRes.allowedMasks[idx];
                            if (newM !== oldM) {
                                cands[c.z][c.y][c.x] = newM;
                                changed = true;
                            }
                        }
                        if (changed) {
                            score += pairWeight;
                            localProgress = true;
                            break;
                        }
                    }
                }
            }
            if (localProgress) break;
        }
        if (localProgress) maxTier = Math.max(maxTier, tierLevel);
        return { contradiction: false, progress: localProgress };
    }

    while (progress) {
        progress = false;
        if (hasContradiction()) return { solved: false, maxTier, score, grid, cands };

        // ── TIER 0A: Grid Naked Singles ──────────────────────────────────
        for (let z = 0; z < 3; z++) {
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    if (grid[z][y][x] === 0) {
                        const mask = cands[z][y][x];
                        if (mask === 0) return { solved: false, maxTier, score, grid, cands };
                        if ((mask & (mask - 1)) === 0) {
                            const d = Math.log2(mask) + 1;
                            if (!placeDigit(z, y, x, d)) return { solved: false, maxTier, score, grid, cands };
                            score += 1;
                            progress = true;
                        }
                    }
                }
            }
        }
        if (progress) continue;

        // ── TIER 0B: Cage Last-Cell Singles (sum - filled) ───────────────
        for (const cage of cagesTest) {
            let currentSum = 0;
            let emptyCell = null;
            let emptyCount = 0;
            for (const c of cage.cells) {
                const val = grid[c.z][c.y][c.x];
                if (val > 0) currentSum += val;
                else { emptyCell = c; emptyCount++; }
            }
            if (emptyCount === 0) {
                if (currentSum !== cage.sum) return { solved: false, maxTier, score, grid, cands };
            } else if (emptyCount === 1) {
                const needed = cage.sum - currentSum;
                if (needed < 1 || needed > 9 || !placeDigit(emptyCell.z, emptyCell.y, emptyCell.x, needed)) {
                    return { solved: false, maxTier, score, grid, cands };
                }
                score += 1;
                progress = true;
            }
        }
        if (progress) continue;

        if (maxAllowedTier < 1) break;

        // ── TIER 1A: Flat z-Slice Hidden Singles (Single 3x3 Grid) ───────
        const zHidden = applyHiddenSinglesOnPlanes(Z_PLANES_45, 1, 2);
        if (zHidden.contradiction) return { solved: false, maxTier, score, grid, cands };
        if (zHidden.progress) { progress = true; continue; }

        // ── TIER 1B: 2-Cell Cage Combinations ────────────────────────────
        for (const cage of cagesTest) {
            let currentSum = 0;
            const emptyCells = [];
            let placedMask = 0;
            for (const c of cage.cells) {
                const val = grid[c.z][c.y][c.x];
                if (val > 0) { currentSum += val; placedMask |= (1 << (val - 1)); }
                else emptyCells.push(c);
            }
            if (emptyCells.length !== 2) continue;

            const remSum = cage.sum - currentSum;
            const cellMasks = emptyCells.map(c => cands[c.z][c.y][c.x] & ~placedMask);
            const evalRes = evaluateCageAssignments(cellMasks, remSum);
            if (!evalRes.valid) return { solved: false, maxTier, score, grid, cands };

            let changed = false;
            for (let i = 0; i < 2; i++) {
                const c = emptyCells[i];
                const oldM = cands[c.z][c.y][c.x];
                const newM = oldM & evalRes.allowedMasks[i];
                if (newM === 0) return { solved: false, maxTier, score, grid, cands };
                if (newM !== oldM) {
                    cands[c.z][c.y][c.x] = newM;
                    changed = true;
                }
            }
            if (changed) {
                score += 3;
                maxTier = Math.max(maxTier, 1);
                progress = true;
            }
        }
        if (progress) continue;

        // ── TIER 1C: Unique 3-Cell Magic Sums (6, 7, 23, 24) ─────────────
        for (const cage of cagesTest) {
            if (cage.cells.length !== 3) continue;
            const magicMask = MAGIC_3_CELL_MASKS[cage.sum];
            if (!magicMask) continue;
            if (cage.cells.some(c => grid[c.z][c.y][c.x] !== 0)) continue;

            let changed = false;
            for (const c of cage.cells) {
                const oldM = cands[c.z][c.y][c.x];
                const newM = oldM & magicMask;
                if (newM === 0) return { solved: false, maxTier, score, grid, cands };
                if (newM !== oldM) {
                    cands[c.z][c.y][c.x] = newM;
                    changed = true;
                }
            }
            if (changed) {
                score += 3;
                maxTier = Math.max(maxTier, 1);
                progress = true;
            }
        }
        if (progress) continue;

        if (maxAllowedTier < 2) break;

        // ── TIER 2A: 3D Orthogonal Depth Hidden Singles (x & y Planes) ───
        const depthHidden = applyHiddenSinglesOnPlanes(DEPTH_PLANES_45, 2, 4);
        if (depthHidden.contradiction) return { solved: false, maxTier, score, grid, cands };
        if (depthHidden.progress) { progress = true; continue; }

        // ── TIER 2B: General Multi-Cell Cage Combinations (3+ Cells) ─────
        for (const cage of cagesTest) {
            let currentSum = 0;
            const emptyCells = [];
            let placedMask = 0;
            for (const c of cage.cells) {
                const val = grid[c.z][c.y][c.x];
                if (val > 0) {
                    const bit = 1 << (val - 1);
                    if (placedMask & bit) return { solved: false, maxTier, score, grid, cands };
                    placedMask |= bit;
                    currentSum += val;
                } else {
                    emptyCells.push(c);
                }
            }
            if (emptyCells.length < 3) continue;

            const remSum = cage.sum - currentSum;
            const cellMasks = emptyCells.map(c => cands[c.z][c.y][c.x] & ~placedMask);
            const evalRes = evaluateCageAssignments(cellMasks, remSum);
            if (!evalRes.valid) return { solved: false, maxTier, score, grid, cands };

            let cageChanged = false;
            for (let i = 0; i < emptyCells.length; i++) {
                const c = emptyCells[i];
                const oldMask = cands[c.z][c.y][c.x];
                const newMask = oldMask & evalRes.allowedMasks[i];
                if (newMask === 0) return { solved: false, maxTier, score, grid, cands };
                if (newMask !== oldMask) {
                    cands[c.z][c.y][c.x] = newMask;
                    cageChanged = true;
                }
            }
            if (cageChanged) {
                score += 5;
                maxTier = Math.max(maxTier, 2);
                progress = true;
            }
        }
        if (progress) continue;

        // ── TIER 2C: Sound Cage-to-Plane Pointing (Forced Cage Digits) ───
        for (const cage of cagesTest) {
            let currentSum = 0;
            const emptyCells = [];
            let placedMask = 0;
            for (const c of cage.cells) {
                const val = grid[c.z][c.y][c.x];
                if (val > 0) { currentSum += val; placedMask |= (1 << (val - 1)); }
                else emptyCells.push(c);
            }
            if (emptyCells.length < 2) continue;

            const cellMasks = emptyCells.map(c => cands[c.z][c.y][c.x] & ~placedMask);
            const evalRes = evaluateCageAssignments(cellMasks, cage.sum - currentSum);
            if (!evalRes.valid) return { solved: false, maxTier, score, grid, cands };

            for (let d = 1; d <= 9; d++) {
                const bit = 1 << (d - 1);
                if (!(evalRes.forcedMask & bit)) continue;

                const cellsWithD = emptyCells.filter(c => (cands[c.z][c.y][c.x] & bit));
                if (cellsWithD.length < 2) continue;

                const shareZ = cellsWithD.every(c => c.z === cellsWithD[0].z);
                const shareY = cellsWithD.every(c => c.y === cellsWithD[0].y);
                const shareX = cellsWithD.every(c => c.x === cellsWithD[0].x);

                if (shareZ) {
                    const pz = cellsWithD[0].z;
                    for (let y = 0; y < 3; y++) {
                        for (let x = 0; x < 3; x++) {
                            if (!cellsWithD.some(c => c.y === y && c.x === x) && grid[pz][y][x] === 0 && (cands[pz][y][x] & bit)) {
                                cands[pz][y][x] &= ~bit;
                                progress = true;
                            }
                        }
                    }
                }
                if (shareY) {
                    const py = cellsWithD[0].y;
                    for (let z = 0; z < 3; z++) {
                        for (let x = 0; x < 3; x++) {
                            if (!cellsWithD.some(c => c.z === z && c.x === x) && grid[z][py][x] === 0 && (cands[z][py][x] & bit)) {
                                cands[z][py][x] &= ~bit;
                                progress = true;
                            }
                        }
                    }
                }
                if (shareX) {
                    const px = cellsWithD[0].x;
                    for (let z = 0; z < 3; z++) {
                        for (let y = 0; y < 3; y++) {
                            if (!cellsWithD.some(c => c.z === z && c.y === y) && grid[z][y][px] === 0 && (cands[z][y][px] & bit)) {
                                cands[z][y][px] &= ~bit;
                                progress = true;
                            }
                        }
                    }
                }
            }
            if (progress) {
                score += 6;
                maxTier = Math.max(maxTier, 2);
                break;
            }
        }
        if (progress) continue;

        // ── TIER 2D: 3D Plane-to-Line Intersection (Claiming) ────────────
        for (const plane of PLANES_45) {
            for (let d = 1; d <= 9; d++) {
                const bit = 1 << (d - 1);
                const cellsWithD = plane.cells.filter(c => grid[c.z][c.y][c.x] === 0 && (cands[c.z][c.y][c.x] & bit));
                if (cellsWithD.length < 2) continue;

                if (plane.axis === 'z') {
                    if (cellsWithD.every(c => c.y === cellsWithD[0].y)) {
                        const py = cellsWithD[0].y;
                        for (let z = 0; z < 3; z++) if (z !== plane.idx) {
                            for (let x = 0; x < 3; x++) if (grid[z][py][x] === 0 && (cands[z][py][x] & bit)) {
                                cands[z][py][x] &= ~bit; progress = true;
                            }
                        }
                    }
                    if (cellsWithD.every(c => c.x === cellsWithD[0].x)) {
                        const px = cellsWithD[0].x;
                        for (let z = 0; z < 3; z++) if (z !== plane.idx) {
                            for (let y = 0; y < 3; y++) if (grid[z][y][px] === 0 && (cands[z][y][px] & bit)) {
                                cands[z][y][px] &= ~bit; progress = true;
                            }
                        }
                    }
                } else if (plane.axis === 'y') {
                    if (cellsWithD.every(c => c.z === cellsWithD[0].z)) {
                        const pz = cellsWithD[0].z;
                        for (let y = 0; y < 3; y++) if (y !== plane.idx) {
                            for (let x = 0; x < 3; x++) if (grid[pz][y][x] === 0 && (cands[pz][y][x] & bit)) {
                                cands[pz][y][x] &= ~bit; progress = true;
                            }
                        }
                    }
                    if (cellsWithD.every(c => c.x === cellsWithD[0].x)) {
                        const px = cellsWithD[0].x;
                        for (let y = 0; y < 3; y++) if (y !== plane.idx) {
                            for (let z = 0; z < 3; z++) if (grid[z][y][px] === 0 && (cands[z][y][px] & bit)) {
                                cands[z][y][px] &= ~bit; progress = true;
                            }
                        }
                    }
                } else if (plane.axis === 'x') {
                    if (cellsWithD.every(c => c.z === cellsWithD[0].z)) {
                        const pz = cellsWithD[0].z;
                        for (let x = 0; x < 3; x++) if (x !== plane.idx) {
                            for (let y = 0; y < 3; y++) if (grid[pz][y][x] === 0 && (cands[pz][y][x] & bit)) {
                                cands[pz][y][x] &= ~bit; progress = true;
                            }
                        }
                    }
                    if (cellsWithD.every(c => c.y === cellsWithD[0].y)) {
                        const py = cellsWithD[0].y;
                        for (let x = 0; x < 3; x++) if (x !== plane.idx) {
                            for (let z = 0; z < 3; z++) if (grid[z][py][x] === 0 && (cands[z][py][x] & bit)) {
                                cands[z][py][x] &= ~bit; progress = true;
                            }
                        }
                    }
                }
                if (progress) break;
            }
            if (progress) {
                score += 6;
                maxTier = Math.max(maxTier, 2);
                break;
            }
        }
        if (progress) continue;

        // ── TIER 2E: Naked Pairs & Hidden Pairs in Planes ────────────────
        for (const plane of PLANES_45) {
            const empties = plane.cells.filter(c => grid[c.z][c.y][c.x] === 0);
            if (empties.length < 3) continue;

            // Naked Pairs
            for (let i = 0; i < empties.length - 1; i++) {
                const m1 = cands[empties[i].z][empties[i].y][empties[i].x];
                if (popcount9(m1) !== 2) continue;
                for (let j = i + 1; j < empties.length; j++) {
                    const m2 = cands[empties[j].z][empties[j].y][empties[j].x];
                    if (m1 === m2) {
                        for (let k = 0; k < empties.length; k++) {
                            if (k === i || k === j) continue;
                            const ck = empties[k];
                            const oldM = cands[ck.z][ck.y][ck.x];
                            if (oldM & m1) {
                                cands[ck.z][ck.y][ck.x] = oldM & ~m1;
                                progress = true;
                            }
                        }
                    }
                }
            }
            if (progress) {
                score += 6;
                maxTier = Math.max(maxTier, 2);
                break;
            }

            // Hidden Pairs
            for (let d1 = 1; d1 <= 8; d1++) {
                const b1 = 1 << (d1 - 1);
                const cells1 = empties.filter(c => cands[c.z][c.y][c.x] & b1);
                if (cells1.length !== 2) continue;
                for (let d2 = d1 + 1; d2 <= 9; d2++) {
                    const b2 = 1 << (d2 - 1);
                    const cells2 = empties.filter(c => cands[c.z][c.y][c.x] & b2);
                    if (cells2.length === 2 && cells1[0] === cells2[0] && cells1[1] === cells2[1]) {
                        const pairMask = b1 | b2;
                        for (const c of cells1) {
                            const oldM = cands[c.z][c.y][c.x];
                            if (oldM !== pairMask) {
                                cands[c.z][c.y][c.x] = pairMask;
                                progress = true;
                            }
                        }
                    }
                }
            }
            if (progress) {
                score += 7;
                maxTier = Math.max(maxTier, 2);
                break;
            }
        }
        if (progress) continue;

        if (maxAllowedTier < 3) break;

        // ── TIER 3: Planar Rule of 45 (Single & Dual Innies/Outies) ──────
        const res45 = applyRegionSumDeductions(PLANES_45, 3, 14, 12, false);
        if (res45.contradiction) return { solved: false, maxTier, score, grid, cands };
        if (res45.progress) {
            progress = true;
            continue;
        }

        if (maxAllowedTier < 4) break;

        // ── TIER 4A: Volumetric Rule of 90 (All 9 Two-Plane Slabs) ───────
        const res90 = applyRegionSumDeductions(PLANES_90, 4, 24, 20, false);
        if (res90.contradiction) return { solved: false, maxTier, score, grid, cands };
        if (res90.progress) {
            progress = true;
            continue;
        }

        // ── TIER 4B: 3-Innie Virtual Cages in 45-Planes ──────────────────
        const res45Tri = applyRegionSumDeductions(PLANES_45, 4, 24, 22, true);
        if (res45Tri.contradiction) return { solved: false, maxTier, score, grid, cands };
        if (res45Tri.progress) {
            progress = true;
            continue;
        }

        // ── TIER 4C: Planar 3D X-Wings across all 9 orthogonal planes ────
        for (const plane of PLANES_45) {
            const getCellAt = (r, c) => {
                if (plane.axis === 'z') return { z: plane.idx, y: r, x: c };
                if (plane.axis === 'y') return { z: r, y: plane.idx, x: c };
                return { z: r, y: c, x: plane.idx };
            };

            for (let d = 1; d <= 9; d++) {
                const bit = 1 << (d - 1);

                // Row-based X-Wing
                const rowPairs = [];
                for (let r = 0; r < 3; r++) {
                    const cols = [];
                    for (let c = 0; c < 3; c++) {
                        const cell = getCellAt(r, c);
                        if (grid[cell.z][cell.y][cell.x] === 0 && (cands[cell.z][cell.y][cell.x] & bit)) {
                            cols.push(c);
                        }
                    }
                    if (cols.length === 2) rowPairs.push({ r, cols });
                }
                if (rowPairs.length === 2 && rowPairs[0].cols[0] === rowPairs[1].cols[0] && rowPairs[0].cols[1] === rowPairs[1].cols[1]) {
                    const c1 = rowPairs[0].cols[0], c2 = rowPairs[0].cols[1];
                    for (let r = 0; r < 3; r++) {
                        if (r === rowPairs[0].r || r === rowPairs[1].r) continue;
                        for (const col of [c1, c2]) {
                            const target = getCellAt(r, col);
                            if (grid[target.z][target.y][target.x] === 0 && (cands[target.z][target.y][target.x] & bit)) {
                                cands[target.z][target.y][target.x] &= ~bit;
                                progress = true;
                            }
                        }
                    }
                }

                // Col-based X-Wing
                const colPairs = [];
                for (let c = 0; c < 3; c++) {
                    const rows = [];
                    for (let r = 0; r < 3; r++) {
                        const cell = getCellAt(r, c);
                        if (grid[cell.z][cell.y][cell.x] === 0 && (cands[cell.z][cell.y][cell.x] & bit)) {
                            rows.push(r);
                        }
                    }
                    if (rows.length === 2) colPairs.push({ c, rows });
                }
                if (colPairs.length === 2 && colPairs[0].rows[0] === colPairs[1].rows[0] && colPairs[0].rows[1] === colPairs[1].rows[1]) {
                    const r1 = colPairs[0].rows[0], r2 = colPairs[0].rows[1];
                    for (let c = 0; c < 3; c++) {
                        if (c === colPairs[0].c || c === colPairs[1].c) continue;
                        for (const row of [r1, r2]) {
                            const target = getCellAt(row, c);
                            if (grid[target.z][target.y][target.x] === 0 && (cands[target.z][target.y][target.x] & bit)) {
                                cands[target.z][target.y][target.x] &= ~bit;
                                progress = true;
                            }
                        }
                    }
                }

                if (progress) break;
            }
            if (progress) {
                score += 26;
                maxTier = Math.max(maxTier, 4);
                break;
            }
        }
        if (progress) continue;
    }

    let isSolved = true;
    for (let z = 0; z < 3; z++)
        for (let y = 0; y < 3; y++)
            for (let x = 0; x < 3; x++)
                if (grid[z][y][x] === 0) isSolved = false;

    return { solved: isSolved, maxTier, score, grid, cands };
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

const DIFFICULTY_SPECS = {
    casual:   { initialClues: 7, maxClues: 9, minTier: 0, maxTier: 0, minScore: 10,  maxScore: 30  },
    easy:     { initialClues: 4, maxClues: 5, minTier: 1, maxTier: 1, minScore: 22,  maxScore: 55  },
    medium:   { initialClues: 2, maxClues: 3, minTier: 2, maxTier: 2, minScore: 45,  maxScore: 95  },
    hard:     { initialClues: 0, maxClues: 1, minTier: 3, maxTier: 3, minScore: 85,  maxScore: 150 },
    fiendish: { initialClues: 0, maxClues: 0, minTier: 3, maxTier: 4, minScore: 125, maxScore: 999 }
};

function formatGeneratedCagesAndClues(solvedGrid, rawCages, targetDiff) {
    const spec = DIFFICULTY_SPECS[targetDiff] || DIFFICULTY_SPECS.medium;
    const actualCages = [];
    const forcedClues = [];
    
    for (const cage of rawCages) {
        if (cage.cells.length === 1) {
            forcedClues.push(cage.cells[0]);
        } else {
            actualCages.push(cage);
        }
    }
    
    const initialG = emptyGrid();
    const clues = [];
    
    for (const c of forcedClues) {
        initialG[c.z][c.y][c.x] = solvedGrid[c.z][c.y][c.x];
        clues.push(`${c.z},${c.y},${c.x}`);
    }
    
    const extraNeeded = spec.initialClues - forcedClues.length;
    
    if (extraNeeded > 0) {
        const allCells = [];
        for (let z = 0; z < 3; z++) {
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    if (!forcedClues.some(fc => fc.z === z && fc.y === y && fc.x === x)) {
                        allCells.push({ z, y, x });
                    }
                }
            }
        }
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

function pickBottleneckCell(logicState, currentInitialG) {
    let minCands = 10;
    let candidates = [];

    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (logicState.grid[z][y][x] === 0 && currentInitialG[z][y][x] === 0) {
                    const count = logicState.cands ? popcount9(logicState.cands[z][y][x]) : 9;
                    if (count < minCands) {
                        minCands = count;
                        candidates = [{ z, y, x }];
                    } else if (count === minCands) {
                        candidates.push({ z, y, x });
                    }
                }
            }
        }
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

function scoreDifficultyFit(logic, clueCount, spec) {
    let penalty = 0;
    if (clueCount > spec.maxClues) penalty += (clueCount - spec.maxClues) * 500;
    if (logic.maxTier < spec.minTier) penalty += (spec.minTier - logic.maxTier) * 300;
    if (logic.maxTier > spec.maxTier) penalty += (logic.maxTier - spec.maxTier) * 300;
    if (logic.score < spec.minScore) penalty += (spec.minScore - logic.score) * 3;
    if (logic.score > spec.maxScore) penalty += (logic.score - spec.maxScore) * 3;
    return penalty;
}

async function generateGame(targetDiff = currentDifficulty) {
    const spec = DIFFICULTY_SPECS[targetDiff] || DIFFICULTY_SPECS.medium;
    let bestPuzzle = null;
    let bestPenalty = Infinity;

    const maxAttempts = targetDiff === 'fiendish' ? 500 : 300;
    const deadline = performance.now() + (targetDiff === 'fiendish' ? 850 : 500);

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        if (attempts > 0 && attempts % 12 === 0) {
            await yieldToMain();
            if (bestPuzzle && performance.now() > deadline) break;
        }

        const grid = emptyGrid();
        generateSolvedGrid(grid, 3, 'standard');
        const rawCages = generateCages(grid, targetDiff);
        const { actualCages, initialG, clues } = formatGeneratedCagesAndClues(grid, rawCages, targetDiff);

        if (clues.length > spec.maxClues) continue;

        const currentInitialG = copyGrid(initialG);
        const currentClues = [...clues];
        let logic = solveLogically(actualCages, currentInitialG, spec.maxTier);

        /* Bottleneck clue injection strictly within target tier clue & technique budget */
        while (!logic.solved && currentClues.length < spec.maxClues) {
            const target = pickBottleneckCell(logic, currentInitialG);
            if (!target) break;
            currentInitialG[target.z][target.y][target.x] = grid[target.z][target.y][target.x];
            currentClues.push(`${target.z},${target.y},${target.x}`);
            logic = solveLogically(actualCages, currentInitialG, spec.maxTier);
        }

        if (logic.solved) {
            const penalty = scoreDifficultyFit(logic, currentClues.length, spec);
            if (penalty < bestPenalty) {
                bestPenalty = penalty;
                bestPuzzle = {
                    clues: currentClues,
                    initialGrid: currentInitialG,
                    solvedGrid: grid,
                    cages: actualCages,
                    map: buildCageMap(actualCages)
                };
                if (penalty === 0) break;
            }
        }
    }

    if (bestPuzzle) return bestPuzzle;

    // Guaranteed-solvable fallback strictly capped at spec.maxTier
    console.warn(`Could not strictly match ${targetDiff} profile within budget. Generating guaranteed ${targetDiff}-capped grid.`);
    const fbGrid = emptyGrid();
    generateSolvedGrid(fbGrid, 3, 'standard');
    const fbRawCages = generateCages(fbGrid, targetDiff);
    const fbData = formatGeneratedCagesAndClues(fbGrid, fbRawCages, targetDiff);

    let fbLogic = solveLogically(fbData.actualCages, fbData.initialG, spec.maxTier);
    while (!fbLogic.solved) {
        const target = pickBottleneckCell(fbLogic, fbData.initialG);
        if (!target) break;
        fbData.initialG[target.z][target.y][target.x] = fbGrid[target.z][target.y][target.x];
        fbData.clues.push(`${target.z},${target.y},${target.x}`);
        fbLogic = solveLogically(fbData.actualCages, fbData.initialG, spec.maxTier);
    }

    return {
        clues: fbData.clues,
        initialGrid: fbData.initialG,
        solvedGrid: fbGrid,
        cages: fbData.actualCages,
        map: buildCageMap(fbData.actualCages)
    };
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
      
      document.body.setAttribute('data-theme', currentTheme);
      const themeSelect = document.getElementById('theme-select');
      if (themeSelect) themeSelect.value = currentTheme;
      
      const stickyToggle = document.getElementById('toggle-sticky-keys');
      if (stickyToggle) stickyToggle.checked = stickyKeysEnabled;
      
      const diffSelect = document.getElementById('difficulty-select');
      if (diffSelect) diffSelect.value = currentDifficulty;
    } catch(e) {}
  }
  applyColorMode(currentColorMode);
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
  const currentStats = stats[currentDifficulty] || stats['medium'];
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
    state, drafts: drafts.map(zLevel => zLevel.map(row => row.map(cellSet => Array.from(cellSet)))),
    initialGrid, solvedGrid, clues: Array.from(clueSet), cages: currentCages, difficulty: currentDifficulty, timer: timerSeconds
  };
  localStorage.setItem('cubiku_killer_save', JSON.stringify(saveData));
}

function clearSave() { localStorage.removeItem('cubiku_killer_save'); }

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
    solvedGrid = data.solvedGrid || emptyGrid();
    clueSet = new Set(data.clues);
    currentCages = data.cages || [];
    currentDifficulty = data.difficulty || "casual";
    
    cageMap = emptyGrid();
    for (const cage of currentCages) {
        for (const cell of cage.cells) cageMap[cell.z][cell.y][cell.x] = cage;
    }

    timerSeconds = data.timer;
    undoStack = [];
    isGameComplete = false; 
    pencilMode = false;
    activeNumber = null;
    
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

function startTimer() { stopTimer(); updateTimerDisplay(); timerInterval = setInterval(() => { timerSeconds++; updateTimerDisplay(); saveGame(); }, 1000); }
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  if (!display) return;
  display.textContent = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(Math.floor(timerSeconds % 60)).padStart(2, '0')}`;
}

let zenMode = false;
function toggleZen() {
  zenMode = !zenMode;
  const timerBar = document.getElementById('timer-bar');
  if (timerBar) timerBar.classList.toggle('zen', zenMode);
  
  const eyeOpen = document.getElementById('icon-eye-open');
  const eyeClosed = document.getElementById('icon-eye-closed');
  if (eyeOpen) eyeOpen.style.display = zenMode ? 'none' : '';
  if (eyeClosed) eyeClosed.style.display = zenMode ? '' : 'none';
  
  const btnZen = document.getElementById('btn-zen');
  if (btnZen) btnZen.title = zenMode ? 'Zen Mode — show timer' : 'Zen Mode — hide timer';
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
    showMessage("Enable Pencil Mode to enter candidates across multiple cells.", "info");
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
      btn.style.opacity = '0.3'; btn.style.textDecoration = 'line-through'; btn.classList.add('depleted', 'active'); btn.classList.remove('active');
      if (activeNumber === String(val)) activeWasDepleted = true;
    } else {
      btn.style.opacity = '1'; btn.style.textDecoration = 'none'; btn.classList.remove('depleted');
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
  for (let c = 0; c < 3; c++) if (c !== col && state[z][row][c] === value) clashEls.push(getCell(z, row, c));
  for (let r = 0; r < 3; r++) if (r !== row && state[z][r][col] === value) clashEls.push(getCell(z, r, col));
  for (let oz = 0; oz < 3; oz++) if (oz !== z && state[oz][row][col] === value) clashEls.push(getCell(oz, row, col));
  
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
  const el = e.currentTarget; const z = Number(el.dataset.z), row = Number(el.dataset.row), col = Number(el.dataset.col);
  if (clueSet.has(`${z},${row},${col}`)) { el.blur(); return; }
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
  if (/^[1-9]$/.test(e.key)) {
    e.preventDefault();
    if (selectedCells.size > 0) {
      applyToSelection(e.key);
      if (!stickyKeysEnabled && !pencilMode && selectedCells.size === 1) clearSelection();
      else renderSelection();
    } else if (!clueSet.has(`${z},${row},${col}`)) {
      fillCell(z, row, col, e.key);
      if (!stickyKeysEnabled && !pencilMode) clearSelection();
    }
    return;
  }
  if (e.key.toLowerCase() === 'p') { e.preventDefault(); pencilMode = !pencilMode; updateKeyboardUI(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoLastAction(); return; }
  if (e.key === 'Escape') { clearSelection(); el.blur(); return; }

  const moves = { ArrowRight: [z, row, (col + 1) % 3], ArrowLeft:  [z, row, (col + 2) % 3], ArrowDown:  [z, (row + 1) % 3, col], ArrowUp:    [z, (row + 2) % 3, col] };
  if (moves[e.key]) {
    e.preventDefault();
    const [nz, nr, nc] = moves[e.key];
    getCell(nz, nr, nc)?.focus();
    if (e.shiftKey && selected) selectRangeTo(nz, nr, nc);
    else selectCell(nz, nr, nc);
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
  if (tutorialActive) endTutorial();
  setLoading(true); hideMessage(); stopTimer(); clearSave(); clearSelection(); isGameComplete = false; 
  pencilMode = false; activeNumber = null;
  
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
    undoStack = []; timerSeconds = 0; solvedGrid = solved; currentCages = cages;
    cageMap = map || buildCageMap(cages);

    renderState(); updateDepletion(); startTimer(); saveGame(); 
    
    const greetings = [
      "Calculations ready.", "Focus.", "🖖", "It all adds up eventually.", 
      "Live long and deduce.", "Fascinating.", "Logic dictates.", "Stay sharp."
    ];
    showMessage(greetings[Math.floor(Math.random() * greetings.length)], "info");
    
    setTimeout(maintainCache, 500);
    
  } catch (err) {
    showMessage(`Failed to load puzzle: ${err.message}`, 'error');
  } finally { setLoading(false); }
}

async function checkSolution() {
  if (isGameComplete || tutorialActive) return; 
  hideMessage(); document.querySelectorAll('.cell.conflict').forEach(c => c.classList.remove('conflict'));

  try {
    const data = check3SSC(state, 3, currentVariant);
    if (data.valid) {
      isGameComplete = true; document.querySelectorAll('.key-btn').forEach(btn => btn.classList.add('control-disabled')); 
      stopTimer(); showMessage(data.message, 'success'); clearSelection(); clearSave(); 
      
      const diff = currentDifficulty;
      stats[diff].wins++; stats[diff].totalTime += timerSeconds; stats[diff].lastTime = timerSeconds;
      if (stats[diff].bestTime === null || timerSeconds < stats[diff].bestTime) stats[diff].bestTime = timerSeconds;
      saveStats();
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
    document.getElementById('settings-panel').style.display = 'none';
    tutorialActive = true;
    
    tutorialBackup = {
        state: copyGrid(state),
        cages: currentCages,
        map: cageMap,
        clues: new Set(clueSet),
        timer: timerSeconds,
        drafts: drafts.map(zL => zL.map(r => r.map(c => new Set(c))))
    };
    stopTimer();
    
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
        tutorialBackup = null;
        renderState();
        startTimer();
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
  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) btnRestart.addEventListener('click', () => {
      if (confirm("Are you sure you want to restart this puzzle from the beginning?")) {
          for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) state[z][y][x] = initialGrid[z][y][x];
          undoStack = []; drafts = emptyDrafts(); isGameComplete = false; pencilMode = false; activeNumber = null;
          clearSelection();
          document.querySelectorAll('.key-btn').forEach(btn => btn.classList.remove('control-disabled'));
          updateKeyboardUI(); timerSeconds = 0; renderState(); updateDepletion(); startTimer(); saveGame(); showMessage("Puzzle restarted.", "info");
      }
  });

  const btnZen = document.getElementById('btn-zen'); if (btnZen) btnZen.addEventListener('click', toggleZen);
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
  
  const toggleSticky = document.getElementById('toggle-sticky-keys'); if (toggleSticky) toggleSticky.addEventListener('change', (e) => { stickyKeysEnabled = e.target.checked; savePreferences(); });

  /* Tutorial UI Hooks */
  document.getElementById('btn-tut-prev').addEventListener('click', prevTutorialStep);
  document.getElementById('btn-tut-next').addEventListener('click', nextTutorialStep);
  document.getElementById('btn-close-tutorial').addEventListener('click', endTutorial);

  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoLastAction(); } });
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

  if (!loadGame()) newGame();
  else setTimeout(maintainCache, 1000); 
}

document.addEventListener('DOMContentLoaded', () => init());