import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DashboardState {
  searchQuery: string;
  activeTab: string;
  favorites: string[];
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: string) => void;
  toggleFavorite: (notebookId: string) => void;
  isFavorite: (notebookId: string) => boolean;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      searchQuery: "",
      activeTab: "all",
      favorites: [],
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      toggleFavorite: (notebookId) =>
        set((state) => {
          const isFav = state.favorites.includes(notebookId);
          const newFavs = isFav
            ? state.favorites.filter((id) => id !== notebookId)
            : [...state.favorites, notebookId];
          return { favorites: newFavs };
        }),
      isFavorite: (notebookId) => get().favorites.includes(notebookId),
    }),
    {
      name: "notebook-dashboard-storage",
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        activeTab: state.activeTab,
        favorites: state.favorites,
      }),
    },
  ),
);
