import { z } from "zod";
import {
  dataTableCellSchema,
  dataTableColumnDefSchema,
  dataTableColumnSchema,
  dataTableContentSchema,
  type DataTableBadgeTone,
  type DataTableCell,
  type DataTableColumn,
  type DataTableContent,
  type DataTableRow,
} from "@/types";

export type DataTableSourceRef = {
  id: string;
  title: string;
};

export type NormalizedDataTableRow = {
  cells: DataTableCell[];
  sourceId?: string;
  rowLabel?: string;
};

export type NormalizedDataTableContent = {
  title: string;
  description?: string;
  tableKind?: string;
  columns: DataTableColumn[];
  rows: NormalizedDataTableRow[];
};

export type DataTableSort = {
  columnIndex: number;
  direction: "asc" | "desc";
} | null;

const legacyDataTableSchema = z.object({
  columns: z.array(z.string()).min(2),
  rows: z.array(z.array(z.string())).min(1),
});

export const DATA_TABLE_BADGE_TONE_CLASS: Record<DataTableBadgeTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  success:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  info: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export function formatEnumLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeDataTableColumn(
  column: z.infer<typeof dataTableColumnDefSchema>,
): DataTableColumn {
  if (typeof column === "string") {
    return { label: column };
  }

  const parsed = dataTableColumnSchema.safeParse(column);
  if (!parsed.success) {
    return { label: String(column) };
  }

  return parsed.data;
}

export function normalizeDataTableCell(
  cell: string | DataTableCell,
): DataTableCell {
  if (typeof cell === "string") {
    return { value: cell, format: "text" };
  }

  const parsed = dataTableCellSchema.safeParse(cell);
  if (!parsed.success) {
    return { value: String(cell), format: "text" };
  }

  return {
    ...parsed.data,
    format: parsed.data.format ?? "text",
  };
}

export function normalizeDataTableContent(
  content: DataTableContent,
  fallbackTitle = "Data table",
): NormalizedDataTableContent {
  const parsed = dataTableContentSchema.safeParse(content);
  if (parsed.success) {
    const columns = parsed.data.columns.map(normalizeDataTableColumn);

    return {
      title: parsed.data.title,
      description: parsed.data.description,
      tableKind: parsed.data.tableKind,
      columns,
      rows: parsed.data.rows.map((row) => normalizeDataTableRow(row)),
    };
  }

  const legacy = legacyDataTableSchema.safeParse(content);
  if (!legacy.success) {
    return {
      title: fallbackTitle,
      columns: [],
      rows: [],
    };
  }

  const columns = legacy.data.columns.map(normalizeDataTableColumn);

  return {
    title: fallbackTitle,
    columns,
    rows: legacy.data.rows.map((cells) => ({
      cells: cells.map((cell) => normalizeDataTableCell(cell)),
    })),
  };
}

function normalizeDataTableRow(row: DataTableRow): NormalizedDataTableRow {
  return {
    sourceId: row.sourceId,
    rowLabel: row.rowLabel,
    cells: row.cells.map((cell, index) => normalizeDataTableCell(cell)),
  };
}

export function getCellPlainText(cell: DataTableCell): string {
  return cell.value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
}

export function rowHasSourceId(
  row: NormalizedDataTableRow,
  sourceId: string,
): boolean {
  if (row.sourceId === sourceId) {
    return true;
  }

  return row.cells.some((cell) => cell.sourceId === sourceId);
}

export function getDataTableSourceRefs(
  rows: NormalizedDataTableRow[],
  sources: DataTableSourceRef[],
): DataTableSourceRef[] {
  const sourceIds = new Set<string>();

  for (const row of rows) {
    if (row.sourceId) {
      sourceIds.add(row.sourceId);
    }

    for (const cell of row.cells) {
      if (cell.sourceId) {
        sourceIds.add(cell.sourceId);
      }
    }
  }

  return sources.filter((source) => sourceIds.has(source.id));
}

export function resolveSourceTitle(
  sourceId: string | undefined,
  sources: DataTableSourceRef[],
): string | undefined {
  if (!sourceId) {
    return undefined;
  }

  return sources.find((source) => source.id === sourceId)?.title;
}

export function resolveCellSourceId(
  cell: DataTableCell,
  row: NormalizedDataTableRow,
): string | undefined {
  return cell.sourceId ?? row.sourceId;
}

export function filterDataTableRows(
  rows: NormalizedDataTableRow[],
  query: string,
  sourceId: string | "all",
  sources: DataTableSourceRef[],
): NormalizedDataTableRow[] {
  const normalizedQuery = query.trim().toLowerCase();

  return rows.filter((row) => {
    if (sourceId !== "all" && !rowHasSourceId(row, sourceId)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      row.rowLabel ?? "",
      ...row.cells.map((cell) => getCellPlainText(cell)),
      ...row.cells.map((cell) => cell.citationQuote ?? ""),
      row.sourceId ? resolveSourceTitle(row.sourceId, sources) : undefined,
      ...row.cells.map((cell) =>
        cell.sourceId ? resolveSourceTitle(cell.sourceId, sources) : undefined,
      ),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function compareCellValues(left: string, right: string): number {
  const leftNumber = Number(left.replace(/[^\d.-]/g, ""));
  const rightNumber = Number(right.replace(/[^\d.-]/g, ""));

  if (
    !Number.isNaN(leftNumber) &&
    !Number.isNaN(rightNumber) &&
    left !== "" &&
    right !== ""
  ) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

export function sortDataTableRows(
  rows: NormalizedDataTableRow[],
  sort: DataTableSort,
): NormalizedDataTableRow[] {
  if (!sort) {
    return rows;
  }

  const next = [...rows];

  next.sort((left, right) => {
    const leftValue = getCellPlainText(
      left.cells[sort.columnIndex] ?? { value: "" },
    );
    const rightValue = getCellPlainText(
      right.cells[sort.columnIndex] ?? { value: "" },
    );
    const result = compareCellValues(leftValue, rightValue);
    return sort.direction === "asc" ? result : -result;
  });

  return next;
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function downloadDataTableCsv(
  table: NormalizedDataTableContent,
  rows: NormalizedDataTableRow[],
): void {
  const header = table.columns
    .map((column) => escapeCsvValue(column.label))
    .join(",");
  const body = rows
    .map((row) =>
      row.cells.map((cell) => escapeCsvValue(getCellPlainText(cell))).join(","),
    )
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${table.title.replace(/[^\w-]+/g, "-").toLowerCase() || "data-table"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildDataTableRowChatPrompt(
  table: NormalizedDataTableContent,
  row: NormalizedDataTableRow,
  sources: DataTableSourceRef[],
): string {
  const lines = [
    "Help me understand this row from my notebook data table.",
    "",
    `Table: ${table.title}`,
  ];

  if (table.description) {
    lines.push(`Context: ${table.description}`);
  }

  lines.push("", "Row data:");

  if (row.rowLabel) {
    lines.push(`- Label: ${row.rowLabel}`);
  }

  table.columns.forEach((column, index) => {
    const cell = row.cells[index];
    if (!cell) {
      return;
    }

    const value = getCellPlainText(cell);
    if (value) {
      lines.push(`- ${column.label}: ${value}`);
    }

    if (cell.citationQuote) {
      lines.push(`  Citation: "${cell.citationQuote}"`);
    }
  });

  const sourceTitle = resolveSourceTitle(row.sourceId, sources);
  if (sourceTitle) {
    lines.push("", `Primary source: ${sourceTitle}`);
  }

  lines.push(
    "",
    "Explain what this row means, how it connects to the broader topic, and what I should take away.",
  );

  return lines.join("\n");
}
