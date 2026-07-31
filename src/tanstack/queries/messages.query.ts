import { useQuery } from "@tanstack/react-query";
import { projectClient } from "@/tanstack/clients/project.client";

export const useMessages = ({ conversationId }: { conversationId: string }) =>
  useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => projectClient.getConversationMessages(conversationId),
    select: (apiData) => apiData.data?.messages || [],
    enabled: !!conversationId,
  });
