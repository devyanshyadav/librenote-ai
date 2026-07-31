import {
  extractJsonMiddleware,
  generateText,
  type LanguageModel,
  NoObjectGeneratedError,
  Output,
  type StopCondition,
  type ToolSet,
  wrapLanguageModel,
} from "ai";
import type { z } from "zod";
import { repairJsonTextValue } from "@/lib/ai/json-repair";
import { getChatModel } from "@/lib/ai/openrouter";

const MAX_RETRIES = 3;

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
};

export async function generateStructuredOutput<OBJECT>(
  options: GenerateStructuredOutputOptions<OBJECT>,
): Promise<{
  output: OBJECT;
  toolResults: { toolName: string; output: unknown }[];
}> {
  const run = () =>
    generateText({
      model: getStructuredOutputModel(),
      output: Output.object({
        schema: options.schema,
        name: options.schemaName,
        description: options.schemaDescription,
      }),
      system: options.system,
      prompt: options.prompt,
      maxRetries: MAX_RETRIES,
      tools: options.tools,
      stopWhen: options.stopWhen,
    });

  try {
    const result = await run();

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
  } catch (error) {
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

    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const repairedText = await repairJsonTextValue(error.text);

      if (repairedText) {
        const parsed = (options.schema as z.ZodType<OBJECT>).safeParse(
          JSON.parse(repairedText),
        );

        if (parsed.success) {
          return { output: parsed.data, toolResults: [] };
        }
      }
    }

    throw error;
  }
}
