import { FileSearch, ListTree, NotebookPen, Sparkles } from "lucide-react";

export const NOTEBOOK_CHAT_STARTER_PROMPTS = [
  {
    icon: Sparkles,
    label: "Summarize sources",
    prompt: "Summarize the key ideas across my selected sources.",
  },
  {
    icon: FileSearch,
    label: "Find answers",
    prompt: "What do my sources say about ",
  },
  {
    icon: NotebookPen,
    label: "Draft notes",
    prompt: "Turn the main takeaways from my sources into structured notes.",
  },
  {
    icon: ListTree,
    label: "Compare documents",
    prompt: "Compare my sources and highlight where they agree or disagree.",
  },
] as const;
