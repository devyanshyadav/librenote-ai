import { generateImage as generateImageModel, type ToolSet, tool } from "ai";
import { z } from "zod";
import { getImageModel } from "@/lib/ai/openrouter";
import { lookupChartPayloadSpec } from "@/lib/studio/report-chart-registry";
import { REPORT_BANNER_PLACEHOLDER_URL } from "@/lib/studio/report-content";
import { createClient } from "@/lib/supabase/server";
import type { StudioArtifactContext } from "@/types";

const STUDIO_ASSETS_BUCKET = "gallery";

export type StudioToolName = "generateImage" | "getChartPayloadSpec";

function extensionForMediaType(mediaType: string) {
  if (mediaType === "image/jpeg") {
    return "jpg";
  }

  if (mediaType === "image/webp") {
    return "webp";
  }

  return "png";
}

async function uploadStudioImage(
  userId: string,
  artifactId: string,
  image: { base64: string; mediaType: string },
) {
  const supabase = await createClient();
  const extension = extensionForMediaType(image.mediaType);
  const storagePath = `${userId}/studio/${artifactId}/${Date.now()}.${extension}`;
  const buffer = Buffer.from(image.base64, "base64");

  const { data, error } = await supabase.storage
    .from(STUDIO_ASSETS_BUCKET)
    .upload(storagePath, buffer, {
      cacheControl: "31536000",
      upsert: false,
      contentType: image.mediaType,
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STUDIO_ASSETS_BUCKET).getPublicUrl(data.path);

  return publicUrl;
}

export function createStudioTools(ctx: StudioArtifactContext) {
  return {
    generateImage: tool({
      description:
        "Generate a report banner image, upload it, and return { url, alt }. Use this for report banners — never invent image URLs.",
      inputSchema: z.object({
        prompt: z
          .string()
          .describe(
            "Abstract editorial visual for the report — no text, words, logos, or watermarks",
          ),
        alt: z.string().describe("Short accessibility description"),
        aspectRatio: z
          .enum(["21:9", "16:9", "4:3", "1:1"])
          .default("21:9")
          .describe("Use 21:9 for report banners"),
      }),
      execute: async ({ prompt, alt, aspectRatio }) => {
        try {
          const { image } = await generateImageModel({
            model: getImageModel(),
            prompt,
            aspectRatio,
            n: 1,
          });

          const url = await uploadStudioImage(ctx.userId, ctx.artifactId, {
            base64: image.base64,
            mediaType: image.mediaType,
          });

          return { url, alt };
        } catch (error) {
          console.error("[studio:generateImage]", error);
          return { url: REPORT_BANNER_PLACEHOLDER_URL, alt };
        }
      },
    }),
    getChartPayloadSpec: tool({
      description:
        "Fetch the required data schema and sample payload structure for a chart ID. Call before each chart section.",
      inputSchema: z.object({
        chartId: z
          .string()
          .describe(
            "Chart identifier: bar_comparison, line_trend, area_trend, or pie_distribution",
          ),
      }),
      execute: async ({ chartId }) => lookupChartPayloadSpec(chartId),
    }),
  };
}

export function pickStudioTools(
  tools: ReturnType<typeof createStudioTools>,
  names: StudioToolName[],
): ToolSet {
  const picked: ToolSet = {};

  for (const name of names) {
    picked[name] = tools[name];
  }

  return picked;
}
