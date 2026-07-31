"use client";

import { Suggestion } from "@/components/ai-elements/suggestion";
import { BrandName } from "@/components/brand-name";
import Logo from "@/components/logo";
import { NOTEBOOK_CHAT_STARTER_PROMPTS } from "@/components/notebook/chat/notebook-chat.constants";
import { useApp } from "@/providers/app-provider";
import { useNotebookChatStore } from "@/stores/notebook-chat.store";

export function ChatEmptyState() {
  const setInput = useNotebookChatStore((state) => state.setInput);
  const { user } = useApp();
  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="flex min-h-[min(68vh,28rem)] animate-in flex-col items-center justify-center px-4 py-10 duration-500 fade-in">
      <div className="mx-auto w-full max-w-lg space-y-8 text-center">
        <div className="space-y-4 flex flex-col items-center justify-center gap-4">
          <Logo size={60} title={false} />
          <div className="space-y-2">
            <h2 className="font-semibold text-2xl tracking-tight">
              Hey <span className="text-primary">{firstName}</span>,{" "}
              <span>welcome to</span>
              <BrandName
                className="inline ml-2"
                suffixClassName="font-semibold"
                scriptClassName="text-3xl"
              />
            </h2>
          </div>
        </div>

        <div className="rounded-2xl p-5 text-left">
          <p className="mb-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Try asking
          </p>
          <div className="mx-auto flex w-full max-w-md flex-wrap justify-center gap-2">
            {NOTEBOOK_CHAT_STARTER_PROMPTS.map((item) => (
              <Suggestion
                key={item.label}
                suggestion={item.prompt}
                onClick={setInput}
                variant="outline"
                className="h-auto gap-2 rounded-xl border-border bg-background px-4 ring-4 ring-muted/20 py-3 text-left hover:border-primary/30 hover:bg-muted/50"
              >
                <item.icon className="size-4 shrink-0 text-primary" />
                <span className="text-foreground text-xs">{item.label}</span>
              </Suggestion>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
