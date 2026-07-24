import type { StructureResolver } from "sanity/structure";
import { CATEGORIES } from "@/lib/categories";
import { apiVersion } from "@/sanity/env";

// One list per collection, generated from the same CATEGORIES array that
// drives the site's routes and the mediaItem categories field -- add or
// remove a category there and this sidebar updates with it, no separate
// list to keep in sync.
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      ...CATEGORIES.map((category) =>
        S.listItem()
          .title(category.label)
          .id(category.slug)
          .child(
            S.documentTypeList("mediaItem")
              .apiVersion(apiVersion)
              .title(category.label)
              .filter('_type == "mediaItem" && $slug in categories')
              .params({ slug: category.slug })
          )
      ),
      S.divider(),
      S.documentTypeListItem("mediaItem").title("All media items"),
    ]);
