import { apiClient } from "@/tanstack/api";
import type { ApiResponse, Message } from "@/types";

export const projectClient = {
  getConversationMessages: async (conversationId: string) => {
    const { data } = await apiClient.get<ApiResponse<{ messages: Message[] }>>(
      `/conversations/${conversationId}/messages`,
    );
    return data;
  },
  getAssistants: async () => {
    const { data } =
      await apiClient.get<ApiResponse<{ assistants: any[] }>>("/assistants");
    return data;
  },
};
