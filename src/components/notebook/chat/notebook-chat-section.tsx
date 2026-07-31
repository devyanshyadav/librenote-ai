import { NotebookChatConversation } from "@/components/notebook/chat/notebook-chat-conversation";
import { getNotebookChatMessages } from "@/lib/chat/message-store.service";

export async function NotebookChatSection({
  notebookId,
}: {
  notebookId: string;
}) {
  const initialMessages = await getNotebookChatMessages(notebookId);

  return (
    <NotebookChatConversation
      key={notebookId}
      notebookId={notebookId}
      initialMessages={initialMessages}
    />
  );
}
