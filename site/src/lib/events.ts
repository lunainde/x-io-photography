// Shared DOM CustomEvent name so gallery tiles (GalleryGrid.tsx) can ask the
// hamburger menu (HamburgerMenu.tsx -- a sibling in the root layout, not an
// ancestor/descendant of the gallery pages) to open, without prop drilling
// or a context provider for what's otherwise a one-off signal.
export const OPEN_MENU_EVENT = "x-io:open-menu";

// Desktop-only threshold for the click-to-open-menu gallery behavior;
// matches the hamburger button's own desktop breakpoint in
// HamburgerMenu.module.css.
export const DESKTOP_MEDIA_QUERY = "(min-width: 1025px)";
