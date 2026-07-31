import type { NextRequest } from "next/server";
import { embedSourceBatch } from "@/lib/sources/source.service";
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
    const result = await embedSourceBatch(user.id, sourceId);

    return apiSuccess(result);
  } catch (error) {
    return apiError(error, "Failed to embed source batch");
  }
}
