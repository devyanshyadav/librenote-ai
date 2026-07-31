import { apiClient } from "@/tanstack/api";
import type {
  ApiResponse,
  StudioArtifactItem,
  StudioArtifactListItem,
  StudioArtifactSlug,
  StudioGenerateOptions,
} from "@/types";

export const studioClient = {
  getArtifacts: async (notebookId: string) => {
    const { data } = await apiClient.get<ApiResponse<StudioArtifactListItem[]>>(
      `/notebooks/${notebookId}/studio`,
    );
    return data;
  },

  getArtifact: async (artifactId: string) => {
    const { data } = await apiClient.get<ApiResponse<StudioArtifactItem>>(
      `/studio/artifacts/${artifactId}`,
    );
    return data;
  },

  generateArtifact: async (
    notebookId: string,
    artifactType: StudioArtifactSlug,
    sourceIds: string[],
    options?: StudioGenerateOptions,
  ) => {
    const { data } = await apiClient.post<ApiResponse<StudioArtifactItem>>(
      `/notebooks/${notebookId}/studio/${artifactType}`,
      { sourceIds, options },
    );
    return data;
  },

  deleteArtifact: async (notebookId: string, artifactId: string) => {
    const { data } = await apiClient.delete<ApiResponse<{ id: string }>>(
      `/notebooks/${notebookId}/studio/artifacts/${artifactId}`,
    );
    return data;
  },

  renameArtifact: async (
    notebookId: string,
    artifactId: string,
    title: string,
  ) => {
    const { data } = await apiClient.patch<ApiResponse<StudioArtifactListItem>>(
      `/notebooks/${notebookId}/studio/artifacts/${artifactId}`,
      { title },
    );
    return data;
  },

  createNote: async (
    notebookId: string,
    input?: { title?: string; body?: string },
  ) => {
    const { data } = await apiClient.post<ApiResponse<StudioArtifactItem>>(
      `/notebooks/${notebookId}/studio/note`,
      input ?? {},
    );
    return data;
  },

  updateNote: async (
    notebookId: string,
    artifactId: string,
    input: { title?: string; body?: string },
  ) => {
    const { data } = await apiClient.patch<ApiResponse<StudioArtifactItem>>(
      `/notebooks/${notebookId}/studio/artifacts/${artifactId}`,
      input,
    );
    return data;
  },
};
