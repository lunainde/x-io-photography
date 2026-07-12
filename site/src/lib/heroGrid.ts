// Tileable diagonal marquee grid for the home hero: an editorial masonry
// collage of true-aspect-ratio photos, tiled seamlessly so the infinite
// drift has no visible seam or repeat boundary.
//
// COPY is the side length (px) of one tileable unit -- it must match the
// bgLoop keyframe translate distance in globals.css so the CSS loop wraps
// seamlessly. GRID_N units per side keeps the background larger than any
// viewport even after the loop's translate, so no raw canvas is ever
// exposed at the edges (see chat1 for the debugging history behind this
// constraint -- it predates the masonry redesign but still applies).
export const COPY = 900;
export const GRID_N = 3;
export const SUPER = COPY * GRID_N;

export const MASONRY_COLUMNS = 4;
export const MASONRY_GAP = 32; // px -- generous "breathing room" between photos

// Over-provisioned per unit so columns always overflow-fill a COPY-tall box
// regardless of actual photo proportions; the excess is clipped by the
// unit's overflow:hidden, same defensive approach the old rigid grid used.
export const IMAGES_PER_UNIT = 10;

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
