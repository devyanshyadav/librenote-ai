import { create } from "zustand";

interface StudioState {
  activeArtifactId: string | null;
  setActiveArtifactId: (id: string | null) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  activeArtifactId: null,
  setActiveArtifactId: (id) => set({ activeArtifactId: id }),
}));
