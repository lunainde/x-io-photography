import type { CategorySlug } from "@/lib/categories";
import { getMediaByCategory } from "@/sanity/queries";
import Footer from "./Footer";
import GalleryGrid from "./GalleryGrid";
import styles from "./CategoryGalleryView.module.css";

export default async function CategoryGalleryView({
  category,
}: {
  category: CategorySlug;
}) {
  const items = await getMediaByCategory(category);

  return (
    <div className={styles.view}>
      <div className={styles.content}>
        <div className={styles.label}>{category.replace("-", " & ")} / X-iO</div>
        <GalleryGrid items={items} />
      </div>
      <Footer />
    </div>
  );
}
