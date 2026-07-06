export type CategorySlug =
  | "home"
  | "architecture"
  | "black-white"
  | "color"
  | "food"
  | "places"
  | "berlin";

export interface CategoryDef {
  slug: CategorySlug;
  label: string;
  route: string;
  hoverColor: string;
}

// Order matches the hamburger menu list from the design handoff.
export const CATEGORIES: CategoryDef[] = [
  { slug: "home", label: "home", route: "/", hoverColor: "#E0E4E7" },
  {
    slug: "architecture",
    label: "architecture",
    route: "/architecture",
    hoverColor: "#FFB399",
  },
  {
    slug: "black-white",
    label: "black & white",
    route: "/black-white",
    hoverColor: "#BFDDF0",
  },
  { slug: "color", label: "color", route: "/color", hoverColor: "#F7D87F" },
  { slug: "food", label: "food", route: "/food", hoverColor: "#AAFFC7" },
  {
    slug: "places",
    label: "places",
    route: "/places",
    hoverColor: "#C1EBE9",
  },
  { slug: "berlin", label: "berlin", route: "/berlin", hoverColor: "#FFD0D0" },
];

export function categoryBySlug(slug: CategorySlug): CategoryDef {
  const found = CATEGORIES.find((c) => c.slug === slug);
  if (!found) throw new Error(`Unknown category slug: ${slug}`);
  return found;
}
