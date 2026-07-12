import Image from "next/image";
import type { MediaItem } from "@/sanity/queries";
import {
  COLLAGE_OFFSETS,
  COPY,
  GRID_N,
  IMAGES_PER_UNIT,
  MASONRY_COLUMNS,
  MASONRY_GAP,
  PLACEHOLDER_RATIOS,
  SUPER,
  stripePattern,
} from "@/lib/heroGrid";
import styles from "./HeroBackground.module.css";

export default function HeroBackground({ items }: { items: MediaItem[] }) {
  return (
    <div className={styles.stage}>
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
              <div
                key={unitIndex}
                className={styles.unit}
                style={{
                  columns: MASONRY_COLUMNS,
                  columnGap: MASONRY_GAP,
                  padding: MASONRY_GAP,
                }}
              >
                {Array.from({ length: IMAGES_PER_UNIT }).map((_, slot) => {
                  const globalIdx = unitIndex * IMAGES_PER_UNIT + slot;
                  const item = items.length ? items[globalIdx % items.length] : null;
                  const offset = COLLAGE_OFFSETS[slot % COLLAGE_OFFSETS.length];

                  return (
                    <div
                      key={slot}
                      className={styles.tile}
                      style={{ marginBottom: MASONRY_GAP, marginTop: offset }}
                    >
                      {item?.imageUrl && item.width && item.height ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.alt}
                          width={item.width}
                          height={item.height}
                          sizes="25vw"
                          className={styles.tileImage}
                        />
                      ) : (
                        <PlaceholderTile index={globalIdx} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderTile({ index }: { index: number }) {
  const [w, h] = PLACEHOLDER_RATIOS[index % PLACEHOLDER_RATIOS.length];
  return (
    <div
      className={styles.placeholder}
      style={{ aspectRatio: `${w} / ${h}`, background: stripePattern(index) }}
    />
  );
}
