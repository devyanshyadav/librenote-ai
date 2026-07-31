"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateNotebook } from "@/tanstack/queries/notebook.query";
import type { CreateNotebookPayload } from "@/types";

export function useNotebookCreate() {
  const router = useRouter();
  const createNotebook = useCreateNotebook();

  const create = async (payload: CreateNotebookPayload = {}) => {
    try {
      const res = await createNotebook.mutateAsync(payload);
      if (!res.data) {
        throw new Error("Failed to create notebook");
      }

      toast.success("Created new notebook!");
      router.push(`/notebook/${res.data.id}?addSource=true`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create notebook",
      );
    }
  };

  return {
    isCreating: createNotebook.isPending,
    create,
  };
}
