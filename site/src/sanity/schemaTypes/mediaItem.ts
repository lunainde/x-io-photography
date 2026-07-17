import { defineField, defineType } from "sanity";
import { CATEGORIES } from "@/lib/categories";

export const mediaItem = defineType({
  name: "mediaItem",
  title: "Media item",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Internal label only, not shown on the site.",
    }),
    defineField({
      name: "categories",
      title: "Categories",
      description: "A photo can belong to more than one gallery.",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: CATEGORIES.map((c) => ({ title: c.label, value: c.slug })),
      },
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "mediaType",
      title: "Media type",
      type: "string",
      options: {
        list: [
          { title: "Image", value: "image" },
          { title: "Video", value: "video" },
        ],
      },
      initialValue: "image",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      hidden: ({ parent }) => parent?.mediaType !== "image",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { mediaType?: string };
          if (parent?.mediaType === "image" && !value) return "Required";
          return true;
        }),
    }),
    defineField({
      name: "video",
      title: "Video file",
      type: "file",
      options: { accept: "video/*" },
      hidden: ({ parent }) => parent?.mediaType !== "video",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { mediaType?: string };
          if (parent?.mediaType === "video" && !value) return "Required";
          return true;
        }),
    }),
    defineField({
      name: "videoPoster",
      title: "Video poster image",
      type: "image",
      hidden: ({ parent }) => parent?.mediaType !== "video",
    }),
    defineField({
      name: "alt",
      title: "Alt text",
      type: "string",
      description: "Describe the image/video for accessibility and SEO.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string",
      description: "Short creative title for the piece.",
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "string",
      description: "Photographer / credit for this piece.",
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "Lower numbers appear first within their category.",
      initialValue: 0,
    }),
  ],
  preview: {
    select: { title: "title", categories: "categories", media: "image" },
    prepare({ title, categories, media }) {
      return {
        title: title || "(untitled)",
        subtitle: (categories || []).join(", "),
        media,
      };
    },
  },
});
