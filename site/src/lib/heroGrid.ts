// Tileable diagonal marquee grid for the home hero: an editorial masonry
// collage of true-aspect-ratio photos, tiled seamlessly so the infinite
// drift has no visible seam or repeat boundary.
//
// COPY is the side length (px) of one tileable unit -- the GSAP tween in
// HeroBackground.tsx animates by exactly this distance (x/y 0 -> COPY/-COPY)
// so the loop wraps seamlessly. GRID_N units per side keeps the background
// larger than any viewport even after the loop's translate, so no raw
// canvas is ever exposed at the edges (see chat1 for the debugging history
// behind this constraint -- it predates the masonry redesign but still
// applies).
export const COPY = 1500;
export const GRID_N = 5;
// export const SUPER = COPY * GRID_N;
export const MASONRY_COLUMNS = 4;
export const MASONRY_GAP = 64; // px -- generous "breathing room" between photos

// NEW FIX: Calculate the exact mathematical period for the seamless loop
export const PERIOD = COPY + MASONRY_GAP;

// NEW FIX: SUPER must account for the gaps between the GRID_N units, otherwise the 1fr tracks get squished!
export const SUPER = (COPY * GRID_N) + (MASONRY_GAP * (GRID_N - 1));



export const COLUMN_WIDTH =
  (COPY - (MASONRY_COLUMNS - 1) * MASONRY_GAP) / MASONRY_COLUMNS;

// Small deterministic stagger cycle applied per tile for the hand-placed
// "editorial collage" feel, layered on top of the natural masonry
// staggering that already comes from varying true aspect ratios.
export const COLLAGE_OFFSETS = [0, 28, 10, 40, 4, 22];

// Representative true photography ratios (w:h), cycled for placeholder
// tiles when no real "home" photos exist in Sanity yet.
export const PLACEHOLDER_RATIOS: [number, number][] = [
  [3, 4],
  [4, 3],
  [1, 1],
  [2, 3],
  [3, 2],
  [4, 5],
  [5, 4],
  [9, 16],
];

export function stripePattern(seed: number) {
  const c1 = seed % 2 === 0 ? "#c9c9c9" : "#c2c2c2";
  const c2 = seed % 2 === 0 ? "#b8b8b8" : "#b1b1b1";
  return `repeating-linear-gradient(135deg, ${c1} 0px, ${c1} 8px, ${c2} 8px, ${c2} 16px)`;
}

// Deterministic shortest-column-first packing: guarantees every column's
// accumulated height reaches at least targetHeight before stopping, so
// overflow:hidden never clips into empty space -- unlike CSS multi-column
// (even with column-fill: auto), which in testing left an inconsistent
// ~17px gap at the bottom of units regardless of how much content was
// over-provisioned. Doing the packing ourselves removes the guesswork.
// T carries whatever the caller needs to render each slot (image ref,
// placeholder index, etc.) alongside the width/height ratio used to pack it.
export function packMasonryColumns<T extends { ratio: number }>(
  columnCount: number,
  targetHeight: number,
  gap: number,
  columnWidth: number,
  pickNext: (globalIndex: number) => T,
): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  const heights = new Array(columnCount).fill(0);
  let globalIndex = 0;
  let guard = 0;
  const maxIterations = 500;

  while (Math.min(...heights) < targetHeight && guard < maxIterations) {
    guard++;
    let shortest = 0;
    for (let i = 1; i < columnCount; i++) {
      if (heights[i] < heights[shortest]) shortest = i;
    }
    const slot = pickNext(globalIndex++);
    const tileHeight = columnWidth / slot.ratio;
    columns[shortest].push(slot);
    heights[shortest] += tileHeight + gap;
  }

  return columns;
}
