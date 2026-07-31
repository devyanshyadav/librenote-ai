import type {
  CitationSource,
  CitationSourcesAnnotation,
  NotebookChatUIMessage,
} from "@/types";

export function extractCitationAnnotationsFromMessage(
  message: NotebookChatUIMessage,
): CitationSourcesAnnotation[] {
  return (message.parts ?? [])
    .filter((part) => part.type === "data-annotation")
    .map((part) => part.data);
}

export function extractCitationAnnotationsFromMessages(
  messages: NotebookChatUIMessage[],
): CitationSourcesAnnotation[] {
  const annotations: CitationSourcesAnnotation[] = [];

  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }

    annotations.push(...extractCitationAnnotationsFromMessage(message));
  }

  return annotations;
}

export function flattenCitationSources(
  annotations: CitationSourcesAnnotation[],
): Record<string, CitationSource> {
  const sourcesById: Record<string, CitationSource> = {};

  for (const annotation of annotations) {
    for (const source of annotation.sources) {
      if (source.id) {
        sourcesById[String(source.id)] = source;
      }

      if (source.chunkDbId) {
        sourcesById[source.chunkDbId] = source;
      }
    }
  }

  return sourcesById;
}

function annotationSignature(annotations: CitationSourcesAnnotation[]): string {
  return annotations
    .map((annotation) =>
      annotation.sources.map((source) => source.id).join(","),
    )
    .join("|");
}

export function buildCitationSourceList(
  storedSourcesById: Record<string, CitationSource>,
  messageParts: NotebookChatUIMessage["parts"] = [],
): CitationSource[] {
  const sourceMap = new Map<string, CitationSource>(
    Object.entries(storedSourcesById),
  );

  for (const part of messageParts) {
    if (part.type !== "data-annotation") {
      continue;
    }

    for (const source of part.data.sources) {
      if (source.id) {
        sourceMap.set(String(source.id), source);
      }
    }
  }

  return Array.from(sourceMap.values());
}

export { annotationSignature };
