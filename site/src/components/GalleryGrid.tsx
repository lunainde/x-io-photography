import Image from "next/image";
import type { MediaItem } from "@/sanity/queries";
import { stripePattern } from "@/lib/heroGrid";
import styles from "./GalleryGrid.module.css";

const PLACEHOLDER_HEIGHTS = [260, 340, 220, 300, 260, 380, 240, 300, 260];

export default function GalleryGrid({
  items,
  borderColor,
}: {
  items: MediaItem[];
  borderColor: string;
}) {
  if (items.length === 0) {
    return (
      <div className={styles.grid}>
        {PLACEHOLDER_HEIGHTS.map((h, i) => (
          <div key={i} className={styles.tile} style={{ borderColor }} data-cursor-grow>
            <div style={{ width: "100%", height: h, background: stripePattern(i) }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div key={item._id} className={styles.tile} style={{ borderColor }} data-cursor-grow>
          {item.mediaType === "video" && item.videoUrl ? (
            <video
              src={item.videoUrl}
              poster={item.videoPosterUrl ?? undefined}
              controls
              className={styles.media}
            />
          ) : item.imageUrl && item.width && item.height ? (
            <Image
              src={item.imageUrl}
              alt={item.alt}
              width={item.width}
              height={item.height}
              sizes="(max-width: 900px) 100vw, 33vw"
              className={styles.media}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
