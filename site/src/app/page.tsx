import Footer from "@/components/Footer";
import HeroBackground from "@/components/HeroBackground";
import Wordmark from "@/components/Wordmark";
import { getMediaByCategory } from "@/sanity/queries";

export default async function HomePage() {
  const items = await getMediaByCategory("home");

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <HeroBackground items={items} />
      <Wordmark />
      <div style={{ position: "relative", zIndex: 1, height: "220vh", pointerEvents: "none" }} />
      <Footer />
    </div>
  );
}
