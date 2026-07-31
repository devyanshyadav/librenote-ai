export const studioQueryKeys = {
  artifacts: (notebookId: string) => ["studio-artifacts", notebookId] as const,
  artifact: (artifactId: string) => ["studio-artifact", artifactId] as const,
};
