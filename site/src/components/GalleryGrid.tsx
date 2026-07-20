"use client";

import Image from "next/image";
import type { MediaItem } from "@/sanity/queries";
import { stripePattern } from "@/lib/heroGrid";
import { DESKTOP_MEDIA_QUERY, OPEN_MENU_EVENT } from "@/lib/events";
import styles from "./GalleryGrid.module.css";

const PLACEHOLDER_HEIGHTS = [260, 340, 220, 300, 260, 380, 240, 300, 260];

// Desktop only: clicking any photo opens the nav menu, same as clicking the
// hamburger. Videos are excluded so clicking play/pause on native controls
// doesn't also pop the menu open.
function openMenuOnDesktop() {
  if (window.matchMedia(DESKTOP_MEDIA_QUERY).matches) {
    window.dispatchEvent(new Event(OPEN_MENU_EVENT));
  }
}

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
          <div
            key={i}
            className={styles.tile}
            style={{ borderColor }}
            data-cursor-grow
            onClick={openMenuOnDesktop}
          >
            <div style={{ width: "100%", height: h, background: stripePattern(i) }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => {
        const isImage = item.mediaType !== "video" && !!item.imageUrl && !!item.width && !!item.height;
        return (
          <div
            key={item._id}
            className={styles.tile}
            style={{ borderColor }}
            data-cursor-grow
            onClick={isImage ? openMenuOnDesktop : undefined}
          >
            {item.mediaType === "video" && item.videoUrl ? (
              <video
                src={item.videoUrl}
                poster={item.videoPosterUrl ?? undefined}
                controls
                className={styles.media}
              />
            ) : isImage ? (
              <Image
                src={item.imageUrl!}
                alt={item.alt}
                width={item.width!}
                height={item.height!}
                sizes="(max-width: 900px) 100vw, 33vw"
                className={styles.media}
              />
            ) : null}
            {item.caption && <span className={styles.caption}>{item.caption}</span>}
          </div>
        );
      })}
    </div>
  );
}
