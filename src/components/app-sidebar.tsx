"use client";

import type { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

type AppSidebarProps = {
  children?: ReactNode;
  side?: "left" | "right";
  collapsible?: "icon" | "none" | "offcanvas";
  className?: string;
  header?: ReactNode;
  content?: ReactNode;
  footer?: ReactNode;
};

export function AppSidebar({
  children,
  side = "left",
  collapsible = "icon",
  className,
  header,
  content,
  footer,
}: AppSidebarProps) {
  return (
    <>
      <Sidebar side={side} collapsible={collapsible} className={className}>
        {header ? <SidebarHeader>{header}</SidebarHeader> : null}
        {content ? <SidebarContent>{content}</SidebarContent> : null}
        {footer ? <SidebarFooter>{footer}</SidebarFooter> : null}
        <SidebarRail />
      </Sidebar>
      {children}
    </>
  );
}
