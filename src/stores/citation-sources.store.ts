import { create } from "zustand";
import {
  annotationSignature,
  extractCitationAnnotationsFromMessages,
  flattenCitationSources,
} from "@/lib/chunks/citation-annotations";
import type { CitationSource, NotebookChatUIMessage } from "@/types";

interface CitationSourcesState {
  sourcesById: Record<string, CitationSource>;
  signature: string;
  syncFromMessages: (messages: NotebookChatUIMessage[]) => void;
}

const emptyState = {
  sourcesById: {} satisfies Record<string, CitationSource>,
  signature: "",
};

export const useCitationSourcesStore = create<CitationSourcesState>(
  (set, get) => ({
    ...emptyState,

    syncFromMessages(messages) {
      const annotations = extractCitationAnnotationsFromMessages(messages);
      const signature = annotationSignature(annotations);

      if (get().signature === signature) {
        return;
      }

      set({
        signature,
        sourcesById: flattenCitationSources(annotations),
      });
    },
  }),
);
