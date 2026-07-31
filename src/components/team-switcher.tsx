"use client";

import type * as React from "react";

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string;
    logo: React.ReactNode;
    plan: string;
  }[];
}) {
  const { state } = useSidebar();
  const activeTeam = teams[0];
  const isCollapsed = state === "collapsed";

  if (!activeTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem className="my-2">
        <div className="group relative flex h-10 w-full items-center gap-2 overflow-hidden rounded-lg transition-colors ">
          {/* Logo Section */}
          <div
            className={cn(
              "flex items-center gap-2 flex-1 transition-all duration-300 ease-in-out",
              isCollapsed &&
                "group-hover:opacity-0 group-hover:scale-90 group-hover:blur-sm",
            )}
          >
            {activeTeam.logo}
            <div
              className={cn(
                "grid flex-1 text-left text-sm leading-tight transition-all duration-300",
                isCollapsed ? "opacity-0 w-0" : "opacity-100",
              )}
            >
              <span className="truncate font-bold tracking-tight text-sidebar-foreground text-lg">
                {activeTeam.name}
              </span>
              <span className="truncate text-[12px] text-muted-foreground font-medium">
                {activeTeam.plan}
              </span>
            </div>
          </div>

          {/* Sidebar Trigger - Absolute overlay for perfect centering and hit area */}
          {isCollapsed && (
            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
              <SidebarTrigger className="h-8 w-8 scale-75 group-hover:scale-100 transition-transform duration-300" />
            </div>
          )}

          {/* Normal trigger when expanded */}
          {!isCollapsed && (
            <SidebarTrigger className="-ml-1 h-8 w-8 shrink-0" />
          )}
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
