"use client";

import { useState } from "react";
import {
  getReportBannerSrc,
  isInvalidReportBannerUrl,
} from "@/lib/studio/report-content";
import { cn } from "@/lib/utils";
import type { ReportBanner } from "@/types";

export function ReportBannerView({
  banner,
  className,
}: {
  banner: ReportBanner;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError || isInvalidReportBannerUrl(banner.url)) {
    return null;
  }

  return (
    <div className={cn("overflow-hidden bg-muted/20 rounded-xl", className)}>
      {/* biome-ignore lint/performance/noImgElement: banner is a hosted studio asset URL */}
      <img
        src={getReportBannerSrc(banner)}
        alt={banner.alt}
        className="aspect-[21/9] h-auto w-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
