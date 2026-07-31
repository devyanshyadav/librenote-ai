export const sourceQueryKeys = {
  notebookSources: (notebookId: string) =>
    ["notebook-sources", notebookId] as const,
  sourceDetail: (sourceId: string) => ["source-detail", sourceId] as const,
};
