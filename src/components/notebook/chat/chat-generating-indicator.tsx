"use client";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { Icon } from "@iconify/react";

export function ChatGeneratingIndicator() {
  return (
    <div className="flex items-center gap-2.5 p-3.5 px-5">
      <Icon
        icon={"svg-spinners:180-ring-with-bg"}
        className="size-5 text-primary"
      />
      <Shimmer className="font-medium text-base tracking-wide">
        Generating Response...
      </Shimmer>
    </div>
  );
}
