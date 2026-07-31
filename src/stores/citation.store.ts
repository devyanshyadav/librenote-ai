import { create } from "zustand";

export type SourceViewMode = "citation" | "browse";

interface CitationState {
  isOpen: boolean;
  viewMode: SourceViewMode | null;
  activeChunkId: string | null;
  activeSourceId: string | null;
  activeSourceTitle: string | null;
  openCitation: (chunkId: string, sourceId: string, title: string) => void;
  openSource: (sourceId: string, title: string) => void;
  closeSidebar: () => void;
}

export const useCitationStore = create<CitationState>((set) => ({
  isOpen: false,
  viewMode: null,
  activeChunkId: null,
  activeSourceId: null,
  activeSourceTitle: null,

  openCitation: (chunkId, sourceId, title) =>
    set({
      isOpen: true,
      viewMode: "citation",
      activeChunkId: chunkId,
      activeSourceId: sourceId,
      activeSourceTitle: title,
    }),

  openSource: (sourceId, title) =>
    set({
      isOpen: true,
      viewMode: "browse",
      activeChunkId: null,
      activeSourceId: sourceId,
      activeSourceTitle: title,
    }),

  closeSidebar: () =>
    set({
      isOpen: false,
      viewMode: null,
      activeChunkId: null,
      activeSourceId: null,
      activeSourceTitle: null,
    }),
}));
