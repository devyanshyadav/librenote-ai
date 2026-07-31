"use client";

import type { ReactNode, RefObject } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  children?: ReactNode;
  side?: "left" | "right";
  collapsible?: "icon" | "none" | "offcanvas";
  className?: string;
  header?: ReactNode;
  content?: ReactNode;
  footer?: ReactNode;
  /** Wraps header + content (+ footer) for fullscreen or other container needs. */
  innerRef?: RefObject<HTMLDivElement | null>;
  innerClassName?: string;
};

export function AppSidebar({
  children,
  side = "left",
  collapsible = "icon",
  className,
  header,
  content,
  footer,
  innerRef,
  innerClassName,
}: AppSidebarProps) {
  const body = (
    <>
      {header ? <SidebarHeader>{header}</SidebarHeader> : null}
      {content ? <SidebarContent>{content}</SidebarContent> : null}
      {footer ? <SidebarFooter>{footer}</SidebarFooter> : null}
    </>
  );

  return (
    <>
      <Sidebar side={side} collapsible={collapsible} className={className}>
        {innerRef ? (
          <div
            ref={innerRef}
            className={cn("flex min-h-0 flex-1 flex-col", innerClassName)}
          >
            {body}
          </div>
        ) : (
          body
        )}
        <SidebarRail />
      </Sidebar>
      {children}
    </>
  );
}
