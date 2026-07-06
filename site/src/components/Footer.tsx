import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      built with ♥️ ☕️ &amp; 🤖 by{" "}
      <a
        href="https://www.x-io.digital/"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        x-io.digital
      </a>
    </footer>
  );
}
