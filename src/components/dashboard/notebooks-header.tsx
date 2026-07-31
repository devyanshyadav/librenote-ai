"use client";

import { Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/stores";

export function NotebooksHeader() {
  const { searchQuery, setSearchQuery, activeTab, setActiveTab } =
    useDashboardStore();

  return (
    <div className="flex flex-col gap-4 border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex items-center *:px-5 bg-transparent">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="my-notebooks">My notebooks</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>
      </Tabs>

      <Input
        type="search"
        placeholder="Search notebooks..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leftIcon={<Search className="size-4" />}
        className="w-full max-w-sm h-11 sm:ml-auto"
      />
    </div>
  );
}
