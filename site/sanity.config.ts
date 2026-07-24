import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { apiVersion, dataset, projectId } from "@/sanity/env";
import { schemaTypes } from "@/sanity/schemaTypes";
import { structure } from "@/sanity/structure";
import { GenerateMetadataAction } from "@/sanity/actions/GenerateMetadataAction";

export default defineConfig({
  basePath: "/studio",
  projectId: projectId || "",
  dataset: dataset || "production",
  schema: { types: schemaTypes },
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: apiVersion })],
  document: {
    actions: (prev, context) =>
      context.schemaType === "mediaItem" ? [GenerateMetadataAction, ...prev] : prev,
  },
});
