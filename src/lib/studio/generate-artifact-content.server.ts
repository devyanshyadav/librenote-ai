import "server-only";
import { generateStructuredOutput } from "@/lib/ai/generate-structured-output";
import type { getArtifactConfig } from "@/lib/studio/artifact-registry";
import { validateMermaidCode } from "@/lib/studio/mermaid-validate.server";
import type { StudioJourneyLog } from "@/lib/studio/studio-journey-log";
import type {
  StudioGeneratedArtifactType,
  VisualFlowContent,
} from "@/types";

const MAX_OUTPUT_VALIDATION_ATTEMPTS = 5;

type ArtifactToolResult = { toolName: string; output: unknown };

type OutputValidator = (output: unknown) => Promise<string | null>;

const OUTPUT_VALIDATORS: Partial<
  Record<StudioGeneratedArtifactType, OutputValidator>
> = {
  visual_flow: async (output) => {
    const content = output as VisualFlowContent;
    const result = await validateMermaidCode(content.code, content.diagramType);
    return result.valid ? null : result.error;
  },
};

function buildValidationRetryPrompt(
  basePrompt: string,
  attempt: number,
  maxAttempts: number,
  error: string,
): string {
  return `${basePrompt}

The previous output failed validation (attempt ${attempt}/${maxAttempts}):
${error}

Fix the issue and return corrected JSON. Keep unrelated fields unchanged unless they must change.`;
}

async function generateStructuredArtifactOutput(params: {
  type: StudioGeneratedArtifactType;
  config: ReturnType<typeof getArtifactConfig>;
  prompt: string;
  onAttemptFailed: (context: {
    attempt: number;
    maxAttempts: number;
    error: unknown;
  }) => void;
}) {
  return generateStructuredOutput({
    schema: params.config.schema,
    schemaName: params.type,
    schemaDescription: params.config.schemaDescription,
    system: params.config.system,
    prompt: params.prompt,
    tools: params.config.tools,
    stopWhen: params.config.stopWhen,
    onAttemptFailed: params.onAttemptFailed,
  });
}

export async function generateArtifactContent(params: {
  type: StudioGeneratedArtifactType;
  config: ReturnType<typeof getArtifactConfig>;
  userPrompt: string;
  onAttemptFailed: (context: {
    attempt: number;
    maxAttempts: number;
    error: unknown;
  }) => void;
  log: StudioJourneyLog;
  artifactId: string;
}): Promise<{
  output: unknown;
  toolResults: ArtifactToolResult[];
}> {
  const validator = OUTPUT_VALIDATORS[params.type];

  if (!validator) {
    return generateStructuredArtifactOutput({
      type: params.type,
      config: params.config,
      prompt: params.userPrompt,
      onAttemptFailed: params.onAttemptFailed,
    });
  }

  const basePrompt = params.userPrompt;
  let prompt = basePrompt;

  for (
    let validationAttempt = 1;
    validationAttempt <= MAX_OUTPUT_VALIDATION_ATTEMPTS;
    validationAttempt += 1
  ) {
    const { output, toolResults } = await generateStructuredArtifactOutput({
      type: params.type,
      config: params.config,
      prompt,
      onAttemptFailed: params.onAttemptFailed,
    });

    params.log.step("artifact", "Validating generated artifact output", {
      artifactId: params.artifactId,
      type: params.type,
      validationAttempt,
      maxValidationAttempts: MAX_OUTPUT_VALIDATION_ATTEMPTS,
    });

    const validationError = await validator(output);

    if (!validationError) {
      params.log.success("artifact", "Output validation passed", {
        artifactId: params.artifactId,
        type: params.type,
        validationAttempt,
      });

      return { output, toolResults };
    }

    params.log.step(
      "artifact",
      "Output validation failed, retrying with feedback",
      {
        artifactId: params.artifactId,
        type: params.type,
        validationAttempt,
        maxValidationAttempts: MAX_OUTPUT_VALIDATION_ATTEMPTS,
        error: validationError,
      },
    );

    if (validationAttempt === MAX_OUTPUT_VALIDATION_ATTEMPTS) {
      params.log.fail("artifact", "Output validation exhausted retries", {
        artifactId: params.artifactId,
        type: params.type,
        error: validationError,
      });
      throw new Error(
        `Output validation failed after ${MAX_OUTPUT_VALIDATION_ATTEMPTS} attempts: ${validationError}`,
      );
    }

    prompt = buildValidationRetryPrompt(
      basePrompt,
      validationAttempt,
      MAX_OUTPUT_VALIDATION_ATTEMPTS,
      validationError,
    );
  }

  throw new Error(`Failed to generate ${params.type} content.`);
}
