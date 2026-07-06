import type { Metadata } from "next";
import CategoryGalleryView from "@/components/CategoryGalleryView";

export const metadata: Metadata = { title: "Architecture — X-iO" };

export default function ArchitecturePage() {
  return <CategoryGalleryView category="architecture" />;
}
