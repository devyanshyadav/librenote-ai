"use client";

import { MessageResponse } from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DATA_TABLE_BADGE_TONE_CLASS,
  getCellPlainText,
} from "@/lib/studio/data-table-utils";
import { cn } from "@/lib/utils";
import type { DataTableCell } from "@/types";
import { ExternalLink } from "lucide-react";

export function DataTableCellView({
  cell,
  rowLabel,
  showRowLabel,
  sourceTitle,
  onOpenSource,
}: {
  cell: DataTableCell;
  rowLabel?: string;
  showRowLabel?: boolean;
  sourceTitle?: string;
  onOpenSource?: () => void;
}) {
  const format = cell.format ?? "text";
  const plainValue = getCellPlainText(cell);

  const content =
    format === "badge" ? (
      <Badge
        variant="outline"
        className={cn(
          "rounded-full px-2.5 py-0.5 font-medium text-xs",
          DATA_TABLE_BADGE_TONE_CLASS[cell.badgeTone ?? "neutral"],
        )}
      >
        {plainValue}
      </Badge>
    ) : format === "markdown" ? (
      <MessageResponse className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 [&_p]:my-0">
        {cell.value}
      </MessageResponse>
    ) : (
      <span className="text-foreground/90">{plainValue}</span>
    );

  return (
    <div className="space-y-1.5">
      {showRowLabel && rowLabel ? (
        <p className="font-medium text-foreground">{rowLabel}</p>
      ) : null}

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{content}</div>
        {onOpenSource ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onOpenSource}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary"
            aria-label={sourceTitle ? `View ${sourceTitle}` : "View source"}
            title={sourceTitle}
          >
            <ExternalLink className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {cell.citationQuote ? (
        <p className="border-border border-l-2 pl-2 text-muted-foreground text-xs italic leading-relaxed">
          “{cell.citationQuote}”
        </p>
      ) : null}
    </div>
  );
}
