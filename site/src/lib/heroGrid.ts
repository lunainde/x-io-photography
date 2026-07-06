// Tileable diagonal-scroll background grid for the home hero.
//
// COPY is the side length (px) of one tileable unit — it must match the
// bgLoop keyframe translate distance in globals.css so the CSS loop wraps
// seamlessly. GRID_N tiles per side keeps the background larger than any
// viewport even after the loop's translate, so no raw canvas is ever
// exposed at the edges (see chat1 for the debugging history behind this).
export const COPY = 1080;
export const GRID_N = 5;
export const SUPER = COPY * GRID_N;

// 4x4 grid-template-areas: a mix of big/landscape/portrait/square cells that
// tile the unit with zero gaps — every one of the 16 cells is claimed
// exactly once across the 8 named areas.
export const AREA_TEMPLATE = '"A A B C" "A A B D" "E F F D" "G G H D"';
export const AREA_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export function stripePattern(seed: number) {
  const c1 = seed % 2 === 0 ? "#c9c9c9" : "#c2c2c2";
  const c2 = seed % 2 === 0 ? "#b8b8b8" : "#b1b1b1";
  return `repeating-linear-gradient(135deg, ${c1} 0px, ${c1} 8px, ${c2} 8px, ${c2} 16px)`;
}
