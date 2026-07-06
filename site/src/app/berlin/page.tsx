import type { Metadata } from "next";
import CategoryGalleryView from "@/components/CategoryGalleryView";

export const metadata: Metadata = { title: "Berlin — X-iO" };

export default function BerlinPage() {
  return <CategoryGalleryView category="berlin" />;
}
