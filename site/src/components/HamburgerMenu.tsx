"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { OPEN_MENU_EVENT } from "@/lib/events";
import type { MediaItem } from "@/sanity/queries";
import styles from "./HamburgerMenu.module.css";

export default function HamburgerMenu({
  mediaByCategory,
}: {
  mediaByCategory: Record<string, MediaItem[]>;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setHovered(null);
    setPreviewItem(null);
  }, [pathname]);

  // Desktop only (see .preview's media query): picks a random image from
  // the hovered category to preview on the left. True aspect ratio, no
  // crop -- box size adapts per photo (see chat with the client on this).
  function handleHover(slug: string) {
    setHovered(slug);
    const items = mediaByCategory[slug];
    setPreviewItem(items?.length ? items[Math.floor(Math.random() * items.length)] : null);
  }
  function clearHover() {
    setHovered(null);
    setPreviewItem(null);
  }

  // Desktop gallery tiles (GalleryGrid.tsx) dispatch this on click so
  // clicking any photo opens navigation, same as clicking the hamburger.
  useEffect(() => {
    const openFromGallery = () => setOpen(true);
    window.addEventListener(OPEN_MENU_EVENT, openFromGallery);
    return () => window.removeEventListener(OPEN_MENU_EVENT, openFromGallery);
  }, []);

  const hoverBg =
    CATEGORIES.find((c) => c.slug === hovered)?.hoverColor ?? "#E0E4E7";

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className={styles.button}
      >
        {open ? (
          <>
            <span
              className={styles.closeLine}
              style={{ transform: "rotate(45deg)" }}
            />
            <span
              className={styles.closeLine}
              style={{ transform: "rotate(-45deg)" }}
            />
          </>
        ) : (
          <Image
            src="/menu-icon.png"
            alt="Menu"
            width={64}
            height={64}
            className={styles.menuIcon}
            priority
          />
        )}
      </button>

      {open && (
        <div className={styles.overlay} style={{ background: hoverBg }}>
          <a
            href="https://www.instagram.com/x.io.digital/"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.sideLink} ${styles.instagramLink}`}
          >
            instagram
          </a>

          {previewItem?.imageUrl && previewItem.width && previewItem.height && (
            <div className={styles.preview}>
              <Image
                src={previewItem.imageUrl}
                alt={previewItem.alt}
                width={previewItem.width}
                height={previewItem.height}
                sizes="30vw"
                style={{
                  display: "block",
                  width: "auto",
                  height: "auto",
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              />
            </div>
          )}

          <div className={styles.listWrap}>
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={c.route}
                onClick={(e) => {
                  // If we are already on this page, just close the menu manually
                  if (pathname === c.route) {
                    setOpen(false);
                  }
                }}
                onMouseEnter={() => handleHover(c.slug)}
                onMouseLeave={clearHover}
                onFocus={() => handleHover(c.slug)}
                onBlur={clearHover}
                className={styles.menuItem}
              >
                {c.label}
              </Link>
            ))}
          </div>

          <a
            href="https://www.x-io.digital/"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.sideLink} ${styles.logoLink}`}
          >
            X-iO
          </a>
        </div>
      )}
    </>
  );
}
