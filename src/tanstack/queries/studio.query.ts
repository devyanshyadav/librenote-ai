import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStudioArtifactStatus } from "@/lib/studio/studio-artifact-status";
import { studioClient } from "@/tanstack/clients";
import type {
  StudioArtifactListItem,
  StudioArtifactSlug,
  StudioGenerateOptions,
} from "@/types";
import { studioQueryKeys } from "./studio.query-keys";

export { studioQueryKeys } from "./studio.query-keys";

function shouldPollArtifacts(artifacts: StudioArtifactListItem[] | undefined) {
  return (
    artifacts?.some(
      (artifact) => getStudioArtifactStatus(artifact) === "processing",
    ) ?? false
  );
}

function prependArtifactToList(
  list: StudioArtifactListItem[],
  artifact: StudioArtifactListItem,
) {
  if (list.some((item) => item.id === artifact.id)) {
    return list;
  }

  return [artifact, ...list];
}

export const useStudioArtifacts = (notebookId: string) => {
  return useQuery({
    queryKey: studioQueryKeys.artifacts(notebookId),
    queryFn: async () => {
      const res = await studioClient.getArtifacts(notebookId);
      return res.data ?? [];
    },
    enabled: !!notebookId,
    refetchInterval: (query) =>
      shouldPollArtifacts(query.state.data) ? 2000 : false,
  });
};

export const useStudioArtifact = (artifactId: string) => {
  return useQuery({
    queryKey: studioQueryKeys.artifact(artifactId),
    queryFn: async () => {
      const res = await studioClient.getArtifact(artifactId);
      return res.data ?? null;
    },
    enabled: !!artifactId,
    refetchInterval: (query) =>
      query.state.data &&
      getStudioArtifactStatus(query.state.data) === "processing"
        ? 2000
        : false,
  });
};

export const useGenerateStudioArtifact = (notebookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      artifactType,
      sourceIds,
      options,
    }: {
      artifactType: StudioArtifactSlug;
      sourceIds: string[];
      options?: StudioGenerateOptions;
    }) =>
      studioClient.generateArtifact(
        notebookId,
        artifactType,
        sourceIds,
        options,
      ),
    onSuccess: (result) => {
      const artifact = result.data;
      if (!artifact) {
        return;
      }

      const listItem: StudioArtifactListItem = {
        id: artifact.id,
        notebookId: artifact.notebookId,
        title: artifact.title,
        status: artifact.status,
        type: artifact.type,
        createdAt: artifact.createdAt,
        updatedAt: artifact.updatedAt,
      };

      queryClient.setQueryData<StudioArtifactListItem[]>(
        studioQueryKeys.artifacts(notebookId),
        (current) => prependArtifactToList(current ?? [], listItem),
      );

      queryClient.setQueryData(studioQueryKeys.artifact(artifact.id), artifact);
    },
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: studioQueryKeys.artifacts(notebookId),
      });
    },
  });
};

export const useCreateStudioNote = (notebookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input?: { title?: string; body?: string }) =>
      studioClient.createNote(notebookId, input),
    onSuccess: (result) => {
      const artifact = result.data;
      if (!artifact) {
        return;
      }

      const listItem: StudioArtifactListItem = {
        id: artifact.id,
        notebookId: artifact.notebookId,
        title: artifact.title,
        status: artifact.status,
        type: artifact.type,
        createdAt: artifact.createdAt,
        updatedAt: artifact.updatedAt,
      };

      queryClient.setQueryData<StudioArtifactListItem[]>(
        studioQueryKeys.artifacts(notebookId),
        (current) => prependArtifactToList(current ?? [], listItem),
      );

      queryClient.setQueryData(studioQueryKeys.artifact(artifact.id), artifact);
    },
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: studioQueryKeys.artifacts(notebookId),
      });
    },
  });
};

export const useUpdateStudioNote = (notebookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      artifactId,
      title,
      body,
    }: {
      artifactId: string;
      title?: string;
      body?: string;
    }) => studioClient.updateNote(notebookId, artifactId, { title, body }),
    onSuccess: (result) => {
      const artifact = result.data;
      if (!artifact) {
        return;
      }

      queryClient.setQueryData<StudioArtifactListItem[]>(
        studioQueryKeys.artifacts(notebookId),
        (current) =>
          (current ?? []).map((item) =>
            item.id === artifact.id
              ? {
                  id: artifact.id,
                  notebookId: artifact.notebookId,
                  title: artifact.title,
                  status: artifact.status,
                  type: artifact.type,
                  createdAt: artifact.createdAt,
                  updatedAt: artifact.updatedAt,
                }
              : item,
          ),
      );

      queryClient.setQueryData(studioQueryKeys.artifact(artifact.id), artifact);
    },
  });
};

export const useDeleteStudioArtifact = (notebookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (artifactId: string) =>
      studioClient.deleteArtifact(notebookId, artifactId),
    onSuccess: (result) => {
      const deletedId = result.data?.id;
      if (!deletedId) return;

      queryClient.setQueryData<StudioArtifactListItem[]>(
        studioQueryKeys.artifacts(notebookId),
        (current) =>
          (current ?? []).filter((artifact) => artifact.id !== deletedId),
      );
      queryClient.removeQueries({
        queryKey: studioQueryKeys.artifact(deletedId),
      });
    },
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: studioQueryKeys.artifacts(notebookId),
      });
    },
  });
};

export const useRenameStudioArtifact = (notebookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      artifactId,
      title,
    }: {
      artifactId: string;
      title: string;
    }) => studioClient.renameArtifact(notebookId, artifactId, title),
    onSuccess: (result) => {
      const updated = result.data;
      if (!updated) return;

      queryClient.setQueryData<StudioArtifactListItem[]>(
        studioQueryKeys.artifacts(notebookId),
        (current) =>
          (current ?? []).map((artifact) =>
            artifact.id === updated.id ? updated : artifact,
          ),
      );

      void queryClient.invalidateQueries({
        queryKey: studioQueryKeys.artifact(updated.id),
      });
    },
    onError: (_error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: studioQueryKeys.artifacts(notebookId),
      });
      void queryClient.invalidateQueries({
        queryKey: studioQueryKeys.artifact(variables.artifactId),
      });
    },
  });
};
