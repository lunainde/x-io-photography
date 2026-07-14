import { client } from "./client";
import type { CategorySlug } from "@/lib/categories";

export interface MediaItem {
  _id: string;
  mediaType: "image" | "video";
  alt: string;
  caption: string | null;
  author: string | null;
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
  caption,
  author,
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
    `*[_type == "mediaItem" && $category in categories] | order(order asc, _createdAt asc) ${MEDIA_ITEM_PROJECTION}`,
    { category },
    { next: { revalidate: 60 } }
  );
}

// For the hamburger menu's hover preview (shows a random image from
// whichever category is hovered): one query for every category's items,
// grouped client-side, rather than one query per category slug.
export async function getAllMediaGroupedByCategory(): Promise<
  Record<string, MediaItem[]>
> {
  if (!client) return {};
  const items: (MediaItem & { categories?: string[] })[] = await client.fetch(
    `*[_type == "mediaItem"]{
      _id,
      mediaType,
      alt,
      caption,
      author,
      order,
      categories,
      "imageUrl": image.asset->url,
      "width": image.asset->metadata.dimensions.width,
      "height": image.asset->metadata.dimensions.height,
      "videoUrl": video.asset->url,
      "videoPosterUrl": videoPoster.asset->url
    }`,
    {},
    { next: { revalidate: 60 } }
  );
  const grouped: Record<string, MediaItem[]> = {};
  for (const item of items) {
    for (const category of item.categories ?? []) {
      (grouped[category] ??= []).push(item);
    }
  }
  return grouped;
}
