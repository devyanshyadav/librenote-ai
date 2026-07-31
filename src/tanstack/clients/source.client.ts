import { apiClient } from "@/tanstack/api";
import type {
  ApiResponse,
  BulkLinkImportResult,
  BulkSourceSelectionPayload,
  CreateSourceResult,
  EmbedSourceBatchResult,
  ImportBulkLinksSourcePayload,
  ImportLinkSourcePayload,
  ImportTextSourcePayload,
  NotebookSource,
  NotebookSourceListItem,
  SourceDetail,
  UpdateSourceSelectionPayload,
} from "@/types";

export const sourceClient = {
  getSource: async (sourceId: string) => {
    const { data } = await apiClient.get<ApiResponse<SourceDetail>>(
      `/sources/${sourceId}`,
    );
    return data;
  },

  getNotebookSources: async (notebookId: string) => {
    const { data } = await apiClient.get<ApiResponse<NotebookSourceListItem[]>>(
      `/notebooks/${notebookId}/sources`,
    );
    return data;
  },

  generateSourceSummary: async (sourceId: string) => {
    const { data } = await apiClient.post<ApiResponse<NotebookSource>>(
      `/sources/${sourceId}/summary`,
    );
    return data;
  },

  updateSourceSelection: async (
    sourceId: string,
    payload: UpdateSourceSelectionPayload,
  ) => {
    const { data } = await apiClient.patch<
      ApiResponse<{ id: string; isSelected: boolean }>
    >(`/sources/${sourceId}`, payload);
    return data;
  },

  updateAllSourceSelection: async (
    notebookId: string,
    payload: BulkSourceSelectionPayload,
  ) => {
    const { data } = await apiClient.patch<
      ApiResponse<{ isSelected: boolean }>
    >(`/notebooks/${notebookId}/sources/selection`, payload);
    return data;
  },

  uploadSource: async (notebookId: string, file: File, title?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("notebookId", notebookId);
    if (title?.trim()) {
      formData.append("title", title.trim());
    }

    const response = await fetch("/api/sources/upload", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as ApiResponse<CreateSourceResult>;

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to upload source");
    }

    return result;
  },

  embedSourceBatch: async (sourceId: string) => {
    const { data } = await apiClient.post<ApiResponse<EmbedSourceBatchResult>>(
      `/sources/${sourceId}/embed`,
    );
    return data;
  },

  importLinkSource: async (payload: ImportLinkSourcePayload) => {
    const { data } = await apiClient.post<ApiResponse<CreateSourceResult>>(
      "/sources/link",
      payload,
    );
    return data;
  },

  importBulkLinks: async (payload: ImportBulkLinksSourcePayload) => {
    const { data } = await apiClient.post<ApiResponse<BulkLinkImportResult>>(
      "/sources/links",
      payload,
    );
    return data;
  },

  importTextSource: async (payload: ImportTextSourcePayload) => {
    const { data } = await apiClient.post<ApiResponse<CreateSourceResult>>(
      "/sources/text",
      payload,
    );
    return data;
  },
};
