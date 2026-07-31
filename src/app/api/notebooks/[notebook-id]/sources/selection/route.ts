import type { NextRequest } from "next/server";
import { updateAllSourceSelection } from "@/lib/sources/source.service";
import { bulkSourceSelectionSchema } from "@/types";
import { apiError, apiSuccess, parseJsonBody } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ "notebook-id": string }> },
) {
  try {
    const { "notebook-id": notebookId } = await params;
    const user = await getAuthenticatedUserOrThrow();
    const { isSelected } = await parseJsonBody(
      bulkSourceSelectionSchema,
      request,
    );
    const result = await updateAllSourceSelection(
      user.id,
      notebookId,
      isSelected,
    );

    return apiSuccess(result);
  } catch (error) {
    return apiError(error, "Failed to update sources");
  }
}
