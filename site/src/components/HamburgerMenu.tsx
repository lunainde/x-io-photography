"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import styles from "./HamburgerMenu.module.css";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setHovered(null);
  }, [pathname]);

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
            style={{ width: "130%", height: "130%", objectFit: "contain" }}
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

          <div className={styles.listWrap}>
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={c.route}
                onMouseEnter={() => setHovered(c.slug)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(c.slug)}
                onBlur={() => setHovered(null)}
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
