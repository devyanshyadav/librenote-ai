import type { NextRequest } from "next/server";
import { after } from "next/server";
import {
  createSourceSummaryJob,
  runSourceSummaryGeneration,
} from "@/lib/sources/source.service";
import { apiError, apiSuccess } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export const maxDuration = 600;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ "source-id": string }> },
) {
  try {
    const { "source-id": sourceId } = await params;
    const user = await getAuthenticatedUserOrThrow();
    const source = await createSourceSummaryJob(user.id, sourceId);

    after(async () => {
      if (source.summaryStatus !== "processing") {
        return;
      }

      try {
        await runSourceSummaryGeneration(user.id, sourceId);
      } catch (error) {
        console.error("[source-summary] Background generation failed:", error);
      }
    });

    return apiSuccess(source);
  } catch (error) {
    return apiError(error, "Failed to generate source summary");
  }
}
