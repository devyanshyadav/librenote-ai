import type { z } from "zod";
import {
  AppError,
  isAppError,
  isSystemErrorMessage,
  resolveApiErrorStatus,
  toUserFacingError,
} from "@/lib/app-error";
import type { ApiResponse } from "@/types";

export function apiSuccess<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    error: null,
  };

  return Response.json(body, { status });
}

export function apiError(error: unknown, fallbackMessage: string): Response {
  let message = fallbackMessage;
  let status = 500;

  if (isAppError(error)) {
    message = error.message;
    status = error.statusCode;
  } else if (error instanceof Error) {
    if (isSystemErrorMessage(error.message)) {
      const friendly = toUserFacingError(error, fallbackMessage);
      message = friendly.message;
      status = friendly.statusCode;
    } else {
      message = error.message;
      status = resolveApiErrorStatus(message);
    }
  } else {
    const friendly = toUserFacingError(error, fallbackMessage);
    message = friendly.message;
    status = friendly.statusCode;
  }

  const body: ApiResponse = {
    success: false,
    data: null,
    error: message,
  };

  return Response.json(body, { status });
}

export async function parseJsonBody<T extends z.ZodType>(
  schema: T,
  request: Request,
): Promise<z.infer<T>> {
  const result = schema.safeParse(await request.json());

  if (!result.success) {
    throw new AppError(`Validation failed: ${result.error.message}`);
  }

  return result.data;
}
