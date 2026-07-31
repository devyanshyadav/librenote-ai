import { cookies } from "next/headers";
import {
  NotebookLeftSidebar,
  NotebookRightSidebar,
} from "@/components/notebook-sidebars";
import { SidebarProvider } from "@/components/ui/sidebar";

const LEFT_SIDEBAR_COOKIE_KEY = "sidebar-left";
const RIGHT_SIDEBAR_COOKIE_KEY = "sidebar-right";

async function getSidebarDefaults(cookieKey: string) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get(`${cookieKey}:state`)?.value;

  return {
    defaultOpen: sidebarState ? sidebarState === "true" : true,
    defaultWidth: cookieStore.get(`${cookieKey}:width`)?.value,
  };
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const [{ id: notebookId }, leftSidebar, rightSidebar] = await Promise.all([
    params,
    getSidebarDefaults(LEFT_SIDEBAR_COOKIE_KEY),
    getSidebarDefaults(RIGHT_SIDEBAR_COOKIE_KEY),
  ]);

  return (
    <div className="flex h-[calc(100dvh-60px)] w-full flex-col overflow-hidden">
      <SidebarProvider
        cookieKey={RIGHT_SIDEBAR_COOKIE_KEY}
        defaultOpen={rightSidebar.defaultOpen}
        defaultWidth={rightSidebar.defaultWidth}
        side="right"
        keyboardShortcut={false}
        className="flex h-full min-h-0"
      >
        <SidebarProvider
          cookieKey={LEFT_SIDEBAR_COOKIE_KEY}
          defaultOpen={leftSidebar.defaultOpen}
          defaultWidth={leftSidebar.defaultWidth}
          side="left"
          className="flex min-h-0 min-w-0 flex-1 pt-3"
        >
          <NotebookLeftSidebar notebookId={notebookId}>
            {children}
          </NotebookLeftSidebar>
        </SidebarProvider>
        <NotebookRightSidebar notebookId={notebookId} />
      </SidebarProvider>
    </div>
  );
}
