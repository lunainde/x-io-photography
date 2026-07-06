import type { Metadata } from "next";
import CategoryGalleryView from "@/components/CategoryGalleryView";

export const metadata: Metadata = { title: "Black & White — X-iO" };

export default function BlackWhitePage() {
  return <CategoryGalleryView category="black-white" />;
}
