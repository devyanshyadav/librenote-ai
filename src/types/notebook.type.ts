import { z } from "zod";

export const notebookListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
});

export type NotebookListItem = z.infer<typeof notebookListItemSchema>;

export const createNotebookSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export type CreateNotebookPayload = z.infer<typeof createNotebookSchema>;

export const updateNotebookSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
});

export type UpdateNotebookPayload = z.infer<typeof updateNotebookSchema>;
