"use client";

import { NotebookCard } from "@/components/dashboard/notebook-card";
import { useNotebooks } from "@/tanstack/queries/notebook.query";
import { useDashboardStore } from "@/stores";
import { Icon } from "@iconify/react";

import type { NotebookListItem } from "@/types";

export function NotebooksGrid() {
  const { data: notebooks = [], isLoading, isError } = useNotebooks();
  const { searchQuery, activeTab, favorites } = useDashboardStore();

  if (isLoading || isError || notebooks.length === 0) {
    return null;
  }

  // Filter based on active tab and search query
  const filteredNotebooks = notebooks.filter((notebook: NotebookListItem) => {
    // 1. Tab filter
    if (activeTab === "favorites") {
      const isFav = favorites.includes(notebook.id);
      if (!isFav) return false;
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const titleMatch = notebook.title.toLowerCase().includes(query);
      const descMatch = (notebook.description || "")
        .toLowerCase()
        .includes(query);
      return titleMatch || descMatch;
    }

    return true;
  });

  if (filteredNotebooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <Icon icon="bi:folder-x" className="size-10" />
        <p className="text-muted-foreground text-sm">
          No notebooks found matching your criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredNotebooks.map((notebook: NotebookListItem) => (
        <NotebookCard key={notebook.id} notebook={notebook} />
      ))}
    </div>
  );
}
