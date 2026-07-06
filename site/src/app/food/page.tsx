import type { Metadata } from "next";
import CategoryGalleryView from "@/components/CategoryGalleryView";

export const metadata: Metadata = { title: "Food — X-iO" };

export default function FoodPage() {
  return <CategoryGalleryView category="food" />;
}
