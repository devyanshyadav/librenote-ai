import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Assistant } from "@/types";

interface AppState {
  assistants: Assistant[];
  activeAssistantId: string | null;
  usedCredits: number;
  fastCount: number;
  smartCount: number;

  // Actions
  addAssistant: (assistant: Omit<Assistant, "id" | "createdAt">) => void;
  deleteAssistant: (id: string) => void;
  setActiveAssistantId: (id: string | null) => void;
  incrementCredits: (routingType: "fast" | "smart") => void;
  resetCredits: () => void;
}

const DEFAULT_ASSISTANTS: Assistant[] = [
  {
    id: "default-fast-1",
    name: "QuickAnswers Bot",
    description:
      "A speedy assistant tailored for quick, fast, and simple everyday queries.",
    systemPrompt:
      "You are a speed-optimized AI bot. Give short, direct, and concise answers to the user's questions.",
    routingType: "fast",
    avatar: "⚡",
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-smart-1",
    name: "DeepReasoning Bot",
    description:
      "A highly intelligent assistant powered by large reasoning models for complex tasks.",
    systemPrompt:
      "You are a smart, thorough AI advisor. Explain your reasoning step-by-step and provide deep insights to help the user solve complex tasks.",
    routingType: "smart",
    avatar: "🧠",
    createdAt: new Date().toISOString(),
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      assistants: DEFAULT_ASSISTANTS,
      activeAssistantId: "default-fast-1",
      usedCredits: 25, // Start with some visual usage
      fastCount: 15,
      smartCount: 5,

      addAssistant: (newAssistant) =>
        set((state) => ({
          assistants: [
            ...state.assistants,
            {
              ...newAssistant,
              id: `bot-${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      deleteAssistant: (id) =>
        set((state) => {
          const filtered = state.assistants.filter((a) => a.id !== id);
          return {
            assistants: filtered,
            activeAssistantId:
              state.activeAssistantId === id
                ? filtered[0]?.id || null
                : state.activeAssistantId,
          };
        }),

      setActiveAssistantId: (id) => set({ activeAssistantId: id }),

      incrementCredits: (routingType) =>
        set((state) => {
          const isSmart = routingType === "smart";
          // Fast calls cost 1 credit, Smart calls cost 10 credits
          const cost = isSmart ? 10 : 1;
          return {
            usedCredits: state.usedCredits + cost,
            fastCount: state.fastCount + (isSmart ? 0 : 1),
            smartCount: state.smartCount + (isSmart ? 1 : 0),
          };
        }),

      resetCredits: () =>
        set({
          usedCredits: 0,
          fastCount: 0,
          smartCount: 0,
        }),
    }),
    {
      name: "mesh-setu-storage",
    },
  ),
);
