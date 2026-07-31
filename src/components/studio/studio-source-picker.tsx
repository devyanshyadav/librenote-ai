"use client";

import { ChevronDown } from "lucide-react";
import { SourceTypeIcon } from "@/components/notebook/source-type-icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { NotebookSourceListItem } from "@/types";

function formatSelectionLabel(
  sources: NotebookSourceListItem[],
  selectedSourceIds: string[],
) {
  if (selectedSourceIds.length === 0) {
    return "Select sources";
  }

  if (selectedSourceIds.length === 1) {
    return (
      sources.find((source) => source.id === selectedSourceIds[0])?.title ??
      "1 source"
    );
  }

  if (selectedSourceIds.length === sources.length) {
    return `All ${sources.length} sources`;
  }

  return `${selectedSourceIds.length} sources selected`;
}

export function StudioSourcePicker({
  sources,
  selectedSourceIds,
  onSelectedSourceIdsChange,
  disabled,
}: {
  sources: NotebookSourceListItem[];
  selectedSourceIds: string[];
  onSelectedSourceIdsChange: (sourceIds: string[]) => void;
  disabled?: boolean;
}) {
  const allSelected =
    sources.length > 0 && selectedSourceIds.length === sources.length;
  const selectedSet = new Set(selectedSourceIds);

  const toggleSource = (sourceId: string, checked: boolean) => {
    onSelectedSourceIdsChange(
      checked
        ? [...selectedSourceIds, sourceId]
        : selectedSourceIds.filter((id) => id !== sourceId),
    );
  };

  return (
    <div className="space-y-1.5">
      <Label>Sources</Label>
      <Popover>
        <PopoverTrigger
          className={"bg-background! h-10 w-full"}
          disabled={disabled || sources.length === 0}
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-9 w-full justify-between px-2.5 font-normal flex items-center gap-2",
                selectedSourceIds.length === 0 && "text-muted-foreground",
              )}
            />
          }
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedSourceIds.length === 1 &&
              (() => {
                const matchedSource = sources.find(
                  (s) => s.id === selectedSourceIds[0],
                );
                return matchedSource ? (
                  <SourceTypeIcon
                    type={matchedSource.type}
                    metadata={matchedSource.metadata}
                    className="size-4 shrink-0"
                  />
                ) : null;
              })()}
            <span className="truncate">
              {formatSelectionLabel(sources, selectedSourceIds)}
            </span>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--anchor-width) gap-0 p-0"
          sideOffset={4}
        >
          {sources.length > 1 ? (
            <div className="flex items-center justify-between border-b px-2 py-1.5">
              <span className="text-muted-foreground text-xs">
                {selectedSourceIds.length} of {sources.length} selected
              </span>
              <button
                type="button"
                className="text-primary p-1 text-xs hover:underline"
                onClick={() =>
                  onSelectedSourceIdsChange(
                    allSelected ? [] : sources.map((source) => source.id),
                  )
                }
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>
          ) : null}
          <div className="max-h-56 overflow-y-auto p-1 space-y-1">
            {sources.map((source) => {
              const checked = selectedSet.has(source.id);

              return (
                <label
                  key={source.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent",
                    checked && "bg-accent/60",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleSource(source.id, value === true)
                    }
                  />
                  <SourceTypeIcon
                    type={source.type}
                    metadata={source.metadata}
                    className="size-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {source.title}
                  </span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
