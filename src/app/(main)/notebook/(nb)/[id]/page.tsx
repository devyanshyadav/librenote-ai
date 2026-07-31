import { Suspense } from "react";
import { AddSourceModalHost } from "@/components/notebook/add-source-modal";
import { NotebookChatBackground } from "@/components/notebook/chat/chat-background";
import { ChatLoadingState } from "@/components/notebook/chat/chat-loading-state";
import { ChatPromptInput } from "@/components/notebook/chat/chat-prompt-input";
import { NotebookChatSection } from "@/components/notebook/chat/notebook-chat-section";

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: notebookId } = await params;

  return (
    <div className="relative flex h-full w-full shrink-0 flex-col overflow-hidden ease-in-out rounded-t-3xl border border-b-0">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <NotebookChatBackground />

        <Suspense fallback={<ChatLoadingState />}>
          <NotebookChatSection notebookId={notebookId} />
        </Suspense>
      </div>

      <ChatPromptInput />

      <Suspense fallback={null}>
        <AddSourceModalHost notebookId={notebookId} />
      </Suspense>
    </div>
  );
}
