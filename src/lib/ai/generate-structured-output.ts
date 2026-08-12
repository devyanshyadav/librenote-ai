import {
  extractJsonMiddleware,
  generateText,
  type LanguageModel,
  NoObjectGeneratedError,
  Output,
  type StopCondition,
  type ToolSet,
  wrapLanguageModel,
  isStepCount,
} from "ai";
import type { z } from "zod";
import { repairJsonTextValue } from "@/lib/ai/json-repair";
import { getChatModel } from "@/lib/ai/openrouter";
import { retryAsync } from "@/utils/async/retry-async";

const MAX_ATTEMPTS = 3;
const API_MAX_RETRIES = 2;

let structuredOutputModel: LanguageModel | null = null;

function getStructuredOutputModel(): LanguageModel {
  structuredOutputModel ??= wrapLanguageModel({
    model: getChatModel(),
    middleware: extractJsonMiddleware(),
  });

  return structuredOutputModel;
}

export type StructuredOutputSchema<OBJECT> = z.ZodType<OBJECT>;

export type GenerateStructuredOutputOptions<OBJECT> = {
  schema: StructuredOutputSchema<OBJECT>;
  system: string;
  prompt: string;
  schemaName?: string;
  schemaDescription?: string;
  tools?: ToolSet;
  stopWhen?: StopCondition<ToolSet>;
  onAttemptFailed?: (context: {
    attempt: number;
    maxAttempts: number;
    error: unknown;
  }) => void;
};

async function generateStructuredOutputAttempt<OBJECT>(
  options: GenerateStructuredOutputOptions<OBJECT>,
): Promise<{
  output: OBJECT;
  toolResults: { toolName: string; output: unknown }[];
}> {
  const result = await generateText({
    model: getStructuredOutputModel(),
    output: Output.object({
      schema: options.schema,
      name: options.schemaName,
      description: options.schemaDescription,
    }),
    system: options.system,
    prompt: options.prompt,
    maxRetries: API_MAX_RETRIES,
    tools: options.tools,
    stopWhen: options.stopWhen || isStepCount(5),
  });

  if (result.output == null) {
    throw new Error("Model did not return structured output.");
  }

  return {
    output: result.output,
    toolResults: result.toolResults.map((toolResult) => ({
      toolName: toolResult.toolName,
      output: toolResult.output,
    })),
  };
}

async function recoverStructuredOutput<OBJECT>(
  options: GenerateStructuredOutputOptions<OBJECT>,
  error: unknown,
): Promise<{
  output: OBJECT;
  toolResults: { toolName: string; output: unknown }[];
} | null> {
  if (
    NoObjectGeneratedError.isInstance(error) &&
    error.text &&
    error.finishReason === "length"
  ) {
    throw new Error(
      "Model output was truncated. Try fewer sources or regenerate.",
      { cause: error },
    );
  }

  if (!NoObjectGeneratedError.isInstance(error) || !error.text) {
    return null;
  }

  const repairedText = await repairJsonTextValue(error.text);
  if (!repairedText) {
    return null;
  }

  const parsed = (options.schema as z.ZodType<OBJECT>).safeParse(
    JSON.parse(repairedText),
  );

  if (!parsed.success) {
    return null;
  }

  return { output: parsed.data, toolResults: [] };
}

export async function generateStructuredOutput<OBJECT>(
  options: GenerateStructuredOutputOptions<OBJECT>,
): Promise<{
  output: OBJECT;
  toolResults: { toolName: string; output: unknown }[];
}> {
  return retryAsync(
    async () => {
      try {
        return await generateStructuredOutputAttempt(options);
      } catch (error) {
        const recovered = await recoverStructuredOutput(options, error);
        if (recovered) {
          return recovered;
        }

        throw error;
      }
    },
    { maxAttempts: MAX_ATTEMPTS, onRetry: options.onAttemptFailed },
  );
}
