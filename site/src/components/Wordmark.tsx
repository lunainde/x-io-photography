export default function Wordmark() {
  return (
    <div
      style={{
        position: "fixed",
        left: 24,
        bottom: 24,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 280,
          color: "var(--color-accent)",
          letterSpacing: "-6px",
          lineHeight: 0.85,
          whiteSpace: "nowrap",
        }}
      >
        X-iO
      </div>
    </div>
  );
}
