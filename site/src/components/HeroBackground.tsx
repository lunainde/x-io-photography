"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import type { MediaItem } from "@/sanity/queries";
import {
  COLLAGE_OFFSETS,
  COLUMN_WIDTH,
  COPY,
  GRID_N,
  MASONRY_COLUMNS,
  MASONRY_GAP,
  PLACEHOLDER_RATIOS,
  SUPER,
  PERIOD, // <--- ADDED THIS
  packMasonryColumns,
  stripePattern,
} from "@/lib/heroGrid";
import styles from "./HeroBackground.module.css";

// Idle (no scroll) time for one full diagonal loop -- slow, luxurious drift.
const BASE_LOOP_SECONDS = 80;
// Scroll velocity (px/s, from ScrollTrigger.getVelocity) that maps to +1x
// of speed multiplier on top of the idle rate.
const VELOCITY_SCALE = 2200;
// Hard cap on how fast a scroll flick can push the drift, so it stays
// fluid rather than becoming a blur.
const MAX_SPEED_MULTIPLIER = 6;
// How quickly the *actual* speed eases toward the scroll-driven target each
// frame (higher = snappier). Kept separate from how quickly the target
// itself decays back to idle once scrolling stops.
const SPEED_EASE = 0.08;
const TARGET_DECAY = 0.025;

interface Slot {
  ratio: number;
  item: MediaItem | null;
  placeholderIndex: number;
  displayUrl?: string;
  displayWidth?: number;
  displayHeight?: number;
}

// Videos have no imageUrl (only the video/videoPoster fields) -- fall back
// to the poster frame as the tile's still image. Videos with no poster set
// in Studio still render as a placeholder, same as before.
function pickSlot(globalIndex: number, items: MediaItem[]): Slot {
  if (items.length) {
    const item = items[globalIndex % items.length];
    const displayUrl = item.imageUrl ?? item.videoPosterUrl ?? undefined;
    const displayWidth = item.imageUrl ? item.width : item.posterWidth;
    const displayHeight = item.imageUrl ? item.height : item.posterHeight;
    if (displayUrl && displayWidth && displayHeight) {
      return {
        ratio: displayWidth / displayHeight,
        item,
        placeholderIndex: -1,
        displayUrl,
        displayWidth,
        displayHeight,
      };
    }
  }
  const [w, h] = PLACEHOLDER_RATIOS[globalIndex % PLACEHOLDER_RATIOS.length];
  return { ratio: w / h, item: null, placeholderIndex: globalIndex };
}

export default function HeroBackground({ items }: { items: MediaItem[] }) {
  const loopRef = useRef<HTMLDivElement>(null);

  const units = useMemo(
    () =>
      Array.from({ length: GRID_N * GRID_N }, (_, unitIndex) =>
        // NEW FIX: Use PERIOD as the target height so columns don't end prematurely PERIOD instead of COPY, which is the width of the whole super-grid. This ensures that the columns fill the entire height of the unit and don't leave gaps at the bottom.
        packMasonryColumns<Slot>(
          MASONRY_COLUMNS,
          PERIOD,
          MASONRY_GAP,
          COLUMN_WIDTH,
          // (i) => pickSlot(unitIndex * 1000 + i, items),
          (i) => pickSlot(i, items),
        ),
      ),
    [items],
  );

  useEffect(() => {
    if (!loopRef.current) return;

    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !loopRef.current) return;

      gsap.registerPlugin(ScrollTrigger);

      // The tween's own start/end values (x/y 0 -> COPY/-COPY, repeat: -1)
      // never change -- only its timeScale does. That's what keeps the loop
      // seamless at any speed: we're just changing how fast time moves
      // through an animation whose path and repeat point are fixed, never
      // touching the values themselves or restarting it.
      const tween = gsap.to(loopRef.current, {
        // x: COPY,
        // y: -COPY,
        x: PERIOD, // NEW FIX Changed from COPY
        y: -PERIOD, // NEW FIX Changed from -COPY
        duration: BASE_LOOP_SECONDS,
        ease: "none",
        repeat: -1,
        // -----------
        // x: -COPY, // Adjust direction
        // y: -COPY,
        // ease: "none",
        // scrollTrigger: {
        //   trigger: "body", // The whole page scrolls
        //   start: "top top",
        //   end: "bottom bottom",
        //   scrub: 1, // This is the magic: animation speed follows scroll speed
        // },
      });

      let targetMultiplier = 1;

      const scrollTrigger = ScrollTrigger.create({
        onUpdate: (self) => {
          const velocity = Math.abs(self.getVelocity());
          targetMultiplier =
            1 + Math.min(velocity / VELOCITY_SCALE, MAX_SPEED_MULTIPLIER - 1);
        },
      });

      const ticker = () => {
        const current = tween.timeScale();
        tween.timeScale(current + (targetMultiplier - current) * SPEED_EASE);
        // Relax the scroll-driven target back toward 1x (idle) every frame,
        // so speed settles back to the slow default shortly after the user
        // stops scrolling, with no separate timeout/debounce needed.
        targetMultiplier += (1 - targetMultiplier) * TARGET_DECAY;
      };
      gsap.ticker.add(ticker);

      cleanup = () => {
        gsap.ticker.remove(ticker);
        scrollTrigger.kill();
        tween.kill();
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div className={styles.stage}>
      <div className={styles.center} style={{ width: SUPER, height: SUPER }}>
        <div ref={loopRef} style={{ width: "100%", height: "100%" }}>
          <div
            className={styles.superGrid}
            style={{
              gridTemplateColumns: `repeat(${GRID_N}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_N}, 1fr)`,
            }}
          >
            {units.map((columns, unitIndex) => (
              <div
                key={unitIndex}
                className={styles.unit}
                style={{ gap: MASONRY_GAP }}
              >
                {columns.map((column, colIndex) => (
                  <div
                    key={colIndex}
                    className={styles.column}
                    style={{ gap: MASONRY_GAP }}
                  >
                    {column.map((slot, slotIndex) => {
                      const offset =
                        COLLAGE_OFFSETS[
                          (colIndex * 7 + slotIndex) % COLLAGE_OFFSETS.length
                        ];
                      return (
                        <div
                          key={slotIndex}
                          className={styles.tile}
                          style={{ marginTop: slotIndex === 0 ? offset : 0 }}
                          data-cursor-grow
                        >
                          {slot.displayUrl &&
                          slot.displayWidth &&
                          slot.displayHeight ? (
                            <Image
                              src={slot.displayUrl}
                              alt={slot.item?.alt ?? ""}
                              width={slot.displayWidth}
                              height={slot.displayHeight}
                              sizes="25vw"
                              className={styles.tileImage}
                            />
                          ) : (
                            <div
                              className={styles.placeholder}
                              style={{
                                aspectRatio: String(slot.ratio),
                                background: stripePattern(
                                  slot.placeholderIndex,
                                ),
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
