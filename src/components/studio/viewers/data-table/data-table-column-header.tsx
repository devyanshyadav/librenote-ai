"use client";

import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CircleDot,
  FileText,
  Gauge,
  Hash,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { DataTableColumn, DataTableColumnKind } from "@/types";

const COLUMN_KIND_ICONS: Partial<Record<DataTableColumnKind, LucideIcon>> = {
  name: Tag,
  status: CircleDot,
  date: Calendar,
  number: Hash,
  metric: Gauge,
  source: FileText,
  text: AlignLeft,
  detail: AlignLeft,
};

export function DataTableColumnHeader({
  column,
  isSorted,
  sortDirection,
  onToggleSort,
}: {
  column: DataTableColumn;
  isSorted: boolean;
  sortDirection: "asc" | "desc" | null;
  onToggleSort: () => void;
}) {
  const KindIcon = column.kind ? COLUMN_KIND_ICONS[column.kind] : null;
  const SortIcon = !isSorted
    ? ArrowUpDown
    : sortDirection === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <button
      type="button"
      onClick={onToggleSort}
      className="inline-flex max-w-full items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide hover:text-foreground cursor-pointer"
    >
      {KindIcon ? (
        <KindIcon className="size-3.5 shrink-0 text-primary/80" />
      ) : null}
      <span className="truncate">{column.label}</span>
      <SortIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
    </button>
  );
}
