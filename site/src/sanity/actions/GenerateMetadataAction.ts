import { useState } from "react";
import { SparklesIcon } from "@sanity/icons";
import { useToast } from "@sanity/ui";
import type { DocumentActionComponent, DocumentActionProps } from "sanity";

interface MediaItemDoc {
  _id: string;
  mediaType?: string;
  image?: unknown;
}

// Studio button that calls /api/generate-metadata (see that route for the
// actual logic) to fill in title/author/alt/caption/location for whichever
// document is currently open -- see chat with the client on why this is a
// button rather than a fully silent webhook: a human should glance at
// AI-written alt text before it's published, same as the review step the
// bulk CLI import already asks for.
export const GenerateMetadataAction: DocumentActionComponent = (
  props: DocumentActionProps,
) => {
  const { draft, published, onComplete } = props;
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const doc = (draft ?? published) as MediaItemDoc | null;
  const hasImage = doc?.mediaType === "image" && Boolean(doc?.image);

  return {
    label: isLoading ? "Generating…" : "Generate metadata",
    icon: SparklesIcon,
    disabled: isLoading || !doc || !hasImage,
    title: hasImage ? undefined : "Upload an image first",
    onHandle: async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/generate-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: doc?._id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed");

        const filled = Object.keys(data.patched ?? {});
        toast.push({
          status: filled.length ? "success" : "warning",
          title: filled.length ? `Filled in: ${filled.join(", ")}` : "Nothing to fill in",
          description: data.hasGps
            ? undefined
            : "No GPS data on this photo -- location needs manual entry.",
        });
        if (data.warnings?.length) {
          toast.push({ status: "warning", title: data.warnings.join(" ") });
        }
      } catch (err) {
        toast.push({
          status: "error",
          title: "Generate metadata failed",
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setIsLoading(false);
        onComplete();
      }
    },
  };
};
