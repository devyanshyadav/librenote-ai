import { Icon } from "@iconify/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function StudioFeatureCard({
  label,
  icon,
  className,
  disabled,
  isLoading,
  onClick,
}: {
  label: string;
  icon: string;
  className: string;
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const buttonContent = (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={onClick}
      className={cn(
        "group relative flex min-h-20 w-full flex-col justify-between rounded-xl border border-border bg-card hover:bg-muted/70 hover:text-accent-foreground p-3 text-left transition-colors shadow-xs disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:rounded-lg",
      )}
    >
      <div className="relative size-10 bg-linear-to-br from-accent/20 to-muted/50 border border-border ring-3 ring-muted/50 rounded-lg flex items-center justify-center group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:ring-0 group-data-[collapsible=icon]:bg-transparent">
        <Icon icon={icon} className={cn("text-primary!", className)} />
      </div>
      <div className="flex items-end justify-between w-full gap-2 group-data-[collapsible=icon]:hidden">
        <span className="font-medium text-sm text-foreground">
          {isLoading ? "Starting..." : label}
        </span>
        <div className="flex size-7 items-center justify-center rounded-full border border-border/80 bg-background/50 group-hover:bg-background transition-colors shrink-0">
          {isLoading ? (
            <Icon
              icon="svg-spinners:ring-resize"
              className="size-3.5 text-primary"
            />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </div>
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger>{buttonContent}</TooltipTrigger>
        <TooltipContent side="left" align="center">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}
