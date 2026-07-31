import type { ChatStatus } from "ai";
import { create } from "zustand";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

interface NotebookChatPromptState {
  notebookId: string | null;
  input: string;
  chatStatus: ChatStatus;
  handleSubmit: (message: PromptInputMessage) => Promise<void>;
  stopGeneration: () => void;
  setInput: (input: string) => void;
  setPromptSession: (session: {
    notebookId: string;
    chatStatus: ChatStatus;
    handleSubmit: (message: PromptInputMessage) => Promise<void>;
    stopGeneration: () => void;
    input?: string;
  }) => void;
  reset: () => void;
}

const noop = async () => {};
const noopStop = () => {};

const createInitialState = () => ({
  notebookId: null,
  input: "",
  chatStatus: "ready" as ChatStatus,
  handleSubmit: noop,
  stopGeneration: noopStop,
});

export const useNotebookChatStore = create<NotebookChatPromptState>((set) => ({
  ...createInitialState(),
  setInput: (input) => set({ input }),
  setPromptSession: ({
    notebookId,
    chatStatus,
    handleSubmit,
    stopGeneration,
    input,
  }) =>
    set({
      notebookId,
      chatStatus,
      handleSubmit,
      stopGeneration,
      ...(input !== undefined ? { input } : {}),
    }),
  reset: () => set(createInitialState()),
}));
