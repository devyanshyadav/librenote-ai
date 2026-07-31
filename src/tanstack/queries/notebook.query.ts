import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notebookClient } from "@/tanstack/clients/notebook.client";
import type {
  ApiResponse,
  CreateNotebookPayload,
  NotebookListItem,
  UpdateNotebookPayload,
} from "@/types";

export const notebookQueryKeys = {
  all: ["notebooks"] as const,
  create: ["notebooks", "create"] as const,
};

export const useNotebooks = () => {
  return useQuery({
    queryKey: notebookQueryKeys.all,
    queryFn: async () => {
      const res = await notebookClient.getNotebooks();
      return res.data ?? [];
    },
  });
};

export const useCreateNotebook = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<NotebookListItem>,
    Error,
    CreateNotebookPayload
  >({
    mutationKey: notebookQueryKeys.create,
    mutationFn: (payload) => notebookClient.createNotebook(payload),
    onSuccess: (res) => {
      const created = res.data;
      if (!created) return;

      queryClient.setQueryData<NotebookListItem[]>(
        notebookQueryKeys.all,
        (current) => [created, ...(current ?? [])],
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notebookQueryKeys.all });
    },
  });
};

export const useDeleteNotebook = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<{ id: string }>, Error, string>({
    mutationFn: (id) => notebookClient.deleteNotebook(id),
    onSuccess: (res) => {
      const deletedId = res.data?.id;
      if (!deletedId) return;

      queryClient.setQueryData<NotebookListItem[]>(
        notebookQueryKeys.all,
        (current) => (current ?? []).filter((item) => item.id !== deletedId),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notebookQueryKeys.all });
    },
  });
};

export const useUpdateNotebook = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<NotebookListItem>,
    Error,
    UpdateNotebookPayload
  >({
    mutationFn: (payload) => notebookClient.updateNotebook(payload),
    onSuccess: (res) => {
      const updated = res.data;
      if (!updated) return;

      queryClient.setQueryData<NotebookListItem[]>(
        notebookQueryKeys.all,
        (current) =>
          (current ?? []).map((item) =>
            item.id === updated.id ? updated : item,
          ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notebookQueryKeys.all });
    },
  });
};
