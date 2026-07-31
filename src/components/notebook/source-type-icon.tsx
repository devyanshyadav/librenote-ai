"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface SourceTypeIconProps {
  type: string;
  metadata?: {
    faviconUrl?: string | null;
    thumbnailUrl?: string | null;
  } | null;
  className?: string;
}

export function SourceTypeIcon({
  type,
  metadata,
  className,
}: SourceTypeIconProps) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const imageUrl =
    type === "web" && metadata?.faviconUrl && !faviconFailed
      ? metadata.faviconUrl
      : type === "youtube" && metadata?.thumbnailUrl && !faviconFailed
        ? metadata.thumbnailUrl
        : null;

  const defaultClasses = "size-6 shrink-0";
  const iconClass = cn(defaultClasses, className);

  if (type === "pdf") {
    return (
      <Icon
        icon="tabler:file-type-pdf"
        className={cn(iconClass, "text-destructive")}
      />
    );
  }

  if (type === "word" || type === "google_doc" || type === "docx") {
    return (
      <Icon
        icon="tabler:file-type-docx"
        className={cn(iconClass, "text-blue-600")}
      />
    );
  }

  if (type === "spreadsheet") {
    return (
      <Icon
        icon="tabler:file-type-xls"
        className={cn(iconClass, "text-emerald-600")}
      />
    );
  }

  if (type === "audio") {
    return (
      <Icon icon="tabler:music" className={cn(iconClass, "text-primary")} />
    );
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={type}
        className={cn(iconClass, "rounded-sm object-contain")}
        onError={() => setFaviconFailed(true)}
      />
    );
  }

  if (type === "youtube") {
    return (
      <Icon
        icon="tabler:brand-youtube"
        className={cn(iconClass, "text-red-600")}
      />
    );
  }

  if (type === "web") {
    return (
      <Icon icon="tabler:world" className={cn(iconClass, "text-primary")} />
    );
  }

  return (
    <Icon icon="tabler:file-text" className={cn(iconClass, "text-primary")} />
  );
}
