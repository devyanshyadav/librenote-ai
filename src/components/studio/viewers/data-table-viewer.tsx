"use client";

import { Download, MessageSquareQuote, Search, Table2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableCellView } from "@/components/studio/viewers/data-table/data-table-cell-view";
import { DataTableColumnHeader } from "@/components/studio/viewers/data-table/data-table-column-header";
import {
  buildDataTableRowChatPrompt,
  downloadDataTableCsv,
  filterDataTableRows,
  formatEnumLabel,
  getCellPlainText,
  getDataTableSourceRefs,
  normalizeDataTableContent,
  resolveCellSourceId,
  resolveSourceTitle,
  sortDataTableRows,
  type DataTableSort,
  type DataTableSourceRef,
  type NormalizedDataTableRow,
} from "@/lib/studio/data-table-utils";
import { cn } from "@/lib/utils";
import { useCitationStore } from "@/stores/citation.store";
import { useNotebookChatStore } from "@/stores/notebook-chat.store";
import type {
  DataTableContent,
  NotebookSourceRef,
  StudioArtifactViewMode,
} from "@/types";

function getSourceFilterLabel(
  value: string | null,
  sources: DataTableSourceRef[],
): string {
  if (!value || value === "all") {
    return "All sources";
  }

  return sources.find((source) => source.id === value)?.title ?? value;
}

function shouldShowRowLabel(
  row: NormalizedDataTableRow,
  columnIndex: number,
): boolean {
  if (columnIndex !== 0 || !row.rowLabel) {
    return false;
  }

  const firstCell = row.cells[0];
  if (!firstCell) {
    return true;
  }

  return (
    row.rowLabel.trim().toLowerCase() !==
    getCellPlainText(firstCell).toLowerCase()
  );
}

export function DataTableViewer({
  content,
  sources = [],
  mode = "studio",
}: {
  content: DataTableContent;
  sources?: NotebookSourceRef[];
  mode?: StudioArtifactViewMode;
}) {
  const table = useMemo(() => normalizeDataTableContent(content), [content]);
  const sourceRefs = useMemo(
    () => sources.map((source) => ({ id: source.id, title: source.title })),
    [sources],
  );
  const tableSources = useMemo(
    () => getDataTableSourceRefs(table.rows, sourceRefs),
    [sourceRefs, table.rows],
  );

  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sort, setSort] = useState<DataTableSort>(null);

  const openSource = useCitationStore((state) => state.openSource);
  const handleSubmit = useNotebookChatStore((state) => state.handleSubmit);
  const chatStatus = useNotebookChatStore((state) => state.chatStatus);

  const visibleRows = useMemo(() => {
    const filtered = filterDataTableRows(
      table.rows,
      query,
      sourceFilter,
      sourceRefs,
    );
    return sortDataTableRows(filtered, sort);
  }, [query, sort, sourceFilter, sourceRefs, table.rows]);

  const toggleSort = useCallback((columnIndex: number) => {
    setSort((current) => {
      if (!current || current.columnIndex !== columnIndex) {
        return { columnIndex, direction: "asc" };
      }

      if (current.direction === "asc") {
        return { columnIndex, direction: "desc" };
      }

      return null;
    });
  }, []);

  const handleExportCsv = useCallback(() => {
    downloadDataTableCsv(table, visibleRows);
    toast.success("CSV downloaded");
  }, [table, visibleRows]);

  const handleAskAboutRow = useCallback(
    (row: NormalizedDataTableRow) => {
      if (mode !== "studio" || chatStatus === "streaming") {
        return;
      }

      void handleSubmit({
        text: buildDataTableRowChatPrompt(table, row, sourceRefs),
        files: [],
      });
      toast.success("Sent row context to chat");
    },
    [chatStatus, handleSubmit, mode, sourceRefs, table],
  );

  const handleOpenSource = useCallback(
    (sourceId: string) => {
      const sourceTitle = resolveSourceTitle(sourceId, sourceRefs);
      if (!sourceTitle) {
        return;
      }

      openSource(sourceId, sourceTitle);
    },
    [openSource, sourceRefs],
  );

  if (table.columns.length === 0 || table.rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No table rows found.</p>
    );
  }

  const showActions = mode === "studio";

  return (
    <div className={cn("flex flex-col gap-4 p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Table2 className="size-4 text-primary" />
            <h2 className="font-semibold text-base">{table.title}</h2>
            {table.tableKind ? (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground uppercase tracking-wide">
                {formatEnumLabel(table.tableKind)}
              </span>
            ) : null}
          </div>
          {table.description ? (
            <p className="text-sm text-muted-foreground">{table.description}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Input
            leftIcon={<Search className="size-4 text-muted-foreground/50" />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search table..."
            className="h-8"
          />
        </div>

        {tableSources.length > 0 ? (
          <Select
            value={sourceFilter}
            onValueChange={(value) => {
              if (value) {
                setSourceFilter(value);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All sources">
                {(value) => getSourceFilterLabel(value, tableSources)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {tableSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="shrink-0 gap-2 cursor-pointer"
        >
          <Download className="size-3.5" />
          Download CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-muted/10">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {table.columns.map((column, columnIndex) => (
                <th
                  key={`${column.label}-${columnIndex}`}
                  className="px-3 py-2.5 text-left"
                >
                  <DataTableColumnHeader
                    column={column}
                    isSorted={sort?.columnIndex === columnIndex}
                    sortDirection={
                      sort?.columnIndex === columnIndex ? sort.direction : null
                    }
                    onToggleSort={() => toggleSort(columnIndex)}
                  />
                </th>
              ))}
              {showActions ? (
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length + (showActions ? 1 : 0)}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  No rows match your filters.
                </td>
              </tr>
            ) : (
              visibleRows.map((row, rowIndex) => (
                <tr
                  key={`${row.sourceId ?? "row"}-${rowIndex}`}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
                >
                  {table.columns.map((column, columnIndex) => {
                    const cell = row.cells[columnIndex] ?? { value: "" };
                    const cellSourceId = resolveCellSourceId(cell, row);
                    const cellSourceTitle = resolveSourceTitle(
                      cellSourceId,
                      sourceRefs,
                    );

                    return (
                      <td
                        key={`${column.label}-${columnIndex}`}
                        className="max-w-sm px-3 py-3 align-top"
                      >
                        <DataTableCellView
                          cell={cell}
                          rowLabel={row.rowLabel}
                          showRowLabel={shouldShowRowLabel(row, columnIndex)}
                          sourceTitle={cellSourceTitle}
                          onOpenSource={
                            cellSourceId && showActions
                              ? () => handleOpenSource(cellSourceId)
                              : undefined
                          }
                        />
                      </td>
                    );
                  })}
                  {showActions ? (
                    <td className="px-3 py-3 align-top">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleAskAboutRow(row)}
                          disabled={chatStatus === "streaming"}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                          aria-label="Ask in chat"
                        >
                          <MessageSquareQuote className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
