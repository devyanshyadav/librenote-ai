import type { NextRequest } from "next/server";
import {
  getSourceDetail,
  updateSourceSelection,
} from "@/lib/sources/source.service";
import { updateSourceSelectionSchema } from "@/types";
import { apiError, apiSuccess, parseJsonBody } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ "source-id": string }> },
) {
  try {
    const { "source-id": sourceId } = await params;
    const user = await getAuthenticatedUserOrThrow();
    const source = await getSourceDetail(user.id, sourceId);

    return apiSuccess(source);
  } catch (error) {
    return apiError(error, "Failed to fetch source");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ "source-id": string }> },
) {
  try {
    const { "source-id": sourceId } = await params;
    const user = await getAuthenticatedUserOrThrow();
    const { isSelected } = await parseJsonBody(
      updateSourceSelectionSchema,
      request,
    );
    const updated = await updateSourceSelection(user.id, sourceId, isSelected);

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error, "Failed to update source");
  }
}
