import { client } from "./client";
import type { CategorySlug } from "@/lib/categories";

export interface MediaItem {
  _id: string;
  mediaType: "image" | "video";
  alt: string;
  order: number;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
}

const MEDIA_ITEM_PROJECTION = /* groq */ `{
  _id,
  mediaType,
  alt,
  order,
  "imageUrl": image.asset->url,
  "width": image.asset->metadata.dimensions.width,
  "height": image.asset->metadata.dimensions.height,
  "videoUrl": video.asset->url,
  "videoPosterUrl": videoPoster.asset->url
}`;

export async function getMediaByCategory(
  category: CategorySlug
): Promise<MediaItem[]> {
  if (!client) return [];
  return client.fetch(
    `*[_type == "mediaItem" && category == $category] | order(order asc, _createdAt asc) ${MEDIA_ITEM_PROJECTION}`,
    { category },
    { next: { revalidate: 60 } }
  );
}
