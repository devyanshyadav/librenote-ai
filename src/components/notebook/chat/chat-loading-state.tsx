"use client";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { FetchLoader } from "@/components/ui/fetch-loader";

export function ChatLoadingState() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-16">
      <FetchLoader size="lg" className="text-primary" />
      <Shimmer className="font-medium text-muted-foreground text-sm">
        Loading conversation...
      </Shimmer>
    </div>
  );
}
