// Tileable diagonal-scroll background grid for the home hero.
//
// COPY is the side length (px) of one tileable unit — it must match the
// bgLoop keyframe translate distance in globals.css so the CSS loop wraps
// seamlessly. GRID_N tiles per side keeps the background larger than any
// viewport even after the loop's translate, so no raw canvas is ever
// exposed at the edges (see chat1 for the debugging history behind this).
export const COPY = 540;
export const GRID_N = 5;
export const SUPER = COPY * GRID_N;

// 2x2 grid-template-areas over a 5fr/4fr column+row split (see .unit in
// HeroBackground.module.css). Because both axes use the same 5:4 split of
// the same available space, every cell lands on an exact ratio: A is a
// square (5fr x 5fr), B is a 4:5 portrait (4fr x 5fr), C is a 5:4 landscape
// (5fr x 4fr), D is a smaller square (4fr x 4fr). This lets source photos be
// prepared at exactly one of three ratios with no ambiguity.
export const AREA_TEMPLATE = '"A B" "C D"';
export const AREA_NAMES = ["A", "B", "C", "D"] as const;

export function stripePattern(seed: number) {
  const c1 = seed % 2 === 0 ? "#c9c9c9" : "#c2c2c2";
  const c2 = seed % 2 === 0 ? "#b8b8b8" : "#b1b1b1";
  return `repeating-linear-gradient(135deg, ${c1} 0px, ${c1} 8px, ${c2} 8px, ${c2} 16px)`;
}
