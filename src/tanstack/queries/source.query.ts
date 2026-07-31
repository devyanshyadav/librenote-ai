import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { handleCreatedSources } from "@/lib/sources/source-ingest-queue";
import { sourceClient } from "@/tanstack/clients";
import type { NotebookSourceListItem, SourceDetail } from "@/types";
import { sourceQueryKeys } from "./source.query-keys";

export { sourceQueryKeys };

function hasProcessingSources(sources: NotebookSourceListItem[] | undefined) {
  return (
    sources?.some((source) => source.ingestStatus === "processing") ?? false
  );
}

export const useSourceDetail = (sourceId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: sourceQueryKeys.sourceDetail(sourceId),
    queryFn: async () => {
      const res = await sourceClient.getSource(sourceId);
      return res.data ?? null;
    },
    enabled: !!sourceId && enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      const source = query.state.data;
      if (!source) {
        return false;
      }

      if (source.ingestStatus === "processing") {
        return 2000;
      }

      return source.summaryStatus === "processing" ? 2000 : false;
    },
  });
};

export const useGenerateSourceSummary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceId: string) =>
      sourceClient.generateSourceSummary(sourceId),
    onSuccess: (result, sourceId) => {
      const source = result.data;
      if (!source) {
        return;
      }

      queryClient.setQueryData<SourceDetail | null>(
        sourceQueryKeys.sourceDetail(sourceId),
        (current) =>
          current
            ? { ...current, ...source }
            : ({ ...source, chunks: [] } as SourceDetail),
      );
    },
    onError: (_error, sourceId) => {
      void queryClient.invalidateQueries({
        queryKey: sourceQueryKeys.sourceDetail(sourceId),
      });
    },
  });
};

export const useNotebookSources = (
  notebookId: string,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: sourceQueryKeys.notebookSources(notebookId),
    queryFn: async () => {
      const res = await sourceClient.getNotebookSources(notebookId);
      return res.data || [];
    },
    enabled: !!notebookId && enabled,
    refetchInterval: (query) =>
      hasProcessingSources(query.state.data) ? 2000 : false,
  });
};

export const useUpdateSourceSelection = (notebookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sourceId,
      isSelected,
    }: {
      sourceId: string;
      isSelected: boolean;
    }) => sourceClient.updateSourceSelection(sourceId, { isSelected }),
    onMutate: async ({ sourceId, isSelected }) => {
      await queryClient.cancelQueries({
        queryKey: sourceQueryKeys.notebookSources(notebookId),
      });

      const previous = queryClient.getQueryData<NotebookSourceListItem[]>(
        sourceQueryKeys.notebookSources(notebookId),
      );

      queryClient.setQueryData<NotebookSourceListItem[]>(
        sourceQueryKeys.notebookSources(notebookId),
        (current) =>
          current?.map((source) =>
            source.id === sourceId ? { ...source, isSelected } : source,
          ) ?? [],
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          sourceQueryKeys.notebookSources(notebookId),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: sourceQueryKeys.notebookSources(notebookId),
      });
    },
  });
};

export const useUpdateAllSourceSelection = (notebookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isSelected: boolean) =>
      sourceClient.updateAllSourceSelection(notebookId, { isSelected }),
    onMutate: async (isSelected) => {
      await queryClient.cancelQueries({
        queryKey: sourceQueryKeys.notebookSources(notebookId),
      });

      const previous = queryClient.getQueryData<NotebookSourceListItem[]>(
        sourceQueryKeys.notebookSources(notebookId),
      );

      queryClient.setQueryData<NotebookSourceListItem[]>(
        sourceQueryKeys.notebookSources(notebookId),
        (current) =>
          current?.map((source) => ({ ...source, isSelected })) ?? [],
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          sourceQueryKeys.notebookSources(notebookId),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: sourceQueryKeys.notebookSources(notebookId),
      });
    },
  });
};

export const useUploadSource = (notebookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) =>
      sourceClient.uploadSource(notebookId, file, title),
    onSuccess: (result) => {
      handleCreatedSources(
        notebookId,
        result.data?.source ? [result.data.source] : [],
        queryClient,
      );
    },
  });
};

export const useImportLinkSource = (notebookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ url, title }: { url: string; title?: string }) =>
      sourceClient.importLinkSource({ notebookId, url, title }),
    onSuccess: (result) => {
      handleCreatedSources(
        notebookId,
        result.data?.source ? [result.data.source] : [],
        queryClient,
      );
    },
  });
};

export const useImportBulkLinks = (notebookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (urls: string[]) =>
      sourceClient.importBulkLinks({ notebookId, urls }),
    onSuccess: (result) => {
      handleCreatedSources(
        notebookId,
        result.data?.succeeded.map((item) => item.source) ?? [],
        queryClient,
      );
    },
  });
};

export const useImportTextSource = (notebookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ text, title }: { text: string; title?: string }) =>
      sourceClient.importTextSource({ notebookId, text, title }),
    onSuccess: (result) => {
      handleCreatedSources(
        notebookId,
        result.data?.source ? [result.data.source] : [],
        queryClient,
      );
    },
  });
};
