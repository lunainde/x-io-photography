"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { MediaItem } from "@/sanity/queries";
import { AREA_NAMES, AREA_TEMPLATE, COPY, GRID_N, SUPER, stripePattern } from "@/lib/heroGrid";
import styles from "./HeroBackground.module.css";

export default function HeroBackground({ items }: { items: MediaItem[] }) {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let scheduled = false;
    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const y = window.scrollY || window.pageYOffset;
        // Wrap the scroll-linked offset to one tile period so it can never
        // drift past the edge of the finite tiled background and expose
        // raw canvas (see chat1 — this was a real bug during design).
        const raw = y * 0.18;
        const wrapped = ((raw % COPY) + COPY) % COPY;
        if (bgRef.current) {
          bgRef.current.style.transform = `translate(${wrapped}px, ${-wrapped}px)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  let globalIndex = 0;

  return (
    <div className={styles.stage}>
      <div ref={bgRef} className={styles.offsetLayer}>
        <div className={styles.center} style={{ width: SUPER, height: SUPER }}>
          <div className="tiled-bg-loop" style={{ width: "100%", height: "100%" }}>
            <div
              className={styles.superGrid}
              style={{
                gridTemplateColumns: `repeat(${GRID_N}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_N}, 1fr)`,
              }}
            >
              {Array.from({ length: GRID_N * GRID_N }).map((_, unitIndex) => (
                <div key={unitIndex} className={styles.unit} style={{ gridTemplateAreas: AREA_TEMPLATE }}>
                  {AREA_NAMES.map((area) => {
                    const idx = globalIndex++;
                    const item = items.length ? items[idx % items.length] : null;
                    return (
                      <div key={area} className={styles.tileWrap} style={{ gridArea: area }}>
                        <div className={styles.tileInner}>
                          {item?.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.alt}
                              fill
                              sizes="25vw"
                              className={styles.tileImage}
                            />
                          ) : (
                            <div style={{ position: "absolute", inset: 0, background: stripePattern(idx) }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
