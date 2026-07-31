import { apiClient } from "@/tanstack/api";
import type {
  ApiResponse,
  CreateNotebookPayload,
  NotebookListItem,
  UpdateNotebookPayload,
} from "@/types";

export const notebookClient = {
  getNotebooks: async () => {
    const { data } =
      await apiClient.get<ApiResponse<NotebookListItem[]>>("/notebooks");
    return data;
  },

  createNotebook: async (payload: CreateNotebookPayload = {}) => {
    const { data } = await apiClient.post<ApiResponse<NotebookListItem>>(
      "/notebooks",
      payload,
    );
    return data;
  },

  deleteNotebook: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<{ id: string }>>(
      `/notebooks?id=${id}`,
    );
    return data;
  },

  updateNotebook: async (payload: UpdateNotebookPayload) => {
    const { data } = await apiClient.patch<ApiResponse<NotebookListItem>>(
      "/notebooks",
      payload,
    );
    return data;
  },
};
