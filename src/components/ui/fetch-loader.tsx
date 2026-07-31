import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface FetchLoaderProps {
  text?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  iconClassName?: string;
}

const sizeMap = {
  xs: "size-3",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

export function FetchLoader({
  text,
  size = "sm",
  className,
  iconClassName,
}: FetchLoaderProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Icon
        icon="svg-spinners:ring-resize"
        className={cn(sizeMap[size], iconClassName)}
      />
      {text && <span className="text-sm">{text}</span>}
    </span>
  );
}
