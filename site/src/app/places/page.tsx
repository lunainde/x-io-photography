import type { Metadata } from "next";
import CategoryGalleryView from "@/components/CategoryGalleryView";

export const metadata: Metadata = { title: "Places — X-iO" };

export default function PlacesPage() {
  return <CategoryGalleryView category="places" />;
}
