import type { Metadata } from "next";
import CategoryGalleryView from "@/components/CategoryGalleryView";

export const metadata: Metadata = { title: "Color — X-iO" };

export default function ColorPage() {
  return <CategoryGalleryView category="color" />;
}
