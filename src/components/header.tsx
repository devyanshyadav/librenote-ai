"use client";

import { useTheme } from "next-themes";
import { Laptop, Moon, Plus, Sun, LogOut, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/providers/app-provider";
import { useNotebookCreate } from "@/hooks/use-notebook-create";
import { FetchLoader } from "@/components/ui/fetch-loader";
import { createClient } from "@/lib/supabase/client";
import { OPENROUTER_KEYS_URL } from "@/lib/ai/openrouter-config";

import { APP_GITHUB_URL } from "@/lib/constants/brand.constants";
import { Icon } from "@iconify/react";

type HeaderProps = {
  showOpenRouterHint?: boolean;
};

export function Header({ showOpenRouterHint = false }: HeaderProps) {
  const { user } = useApp();
  const { theme, setTheme } = useTheme();
  const { isCreating, create } = useNotebookCreate();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      router.push("/auth");
    } catch (_error) {
      toast.error("Failed to logout");
    }
  };

  const name =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  const avatar = user?.user_metadata?.avatar_url || "";

  return (
    <header className=" px-14 sticky top-0 z-50">
      <div className=" max-w-full mx-auto h-14 ring-4 ring-border/50 flex items-center gap-3 justify-between p-4 px-2  w-full border border-t-0 border-border bg-background/65 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-b-3xl">
        <Logo size={40} className="text-primary shrink-0" />

        {showOpenRouterHint ? (
          <div className="flex min-w-0 items-center bg-red-500/20 p-1.5 px-3 rounded-xl w-fit! justify-center gap-2 px-2">
            <KeyRound className="size-4 shrink-0 text-primary" />
            <p className="hidden truncate text-center text-xs text-muted-foreground sm:block">
              Add{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                OPENROUTER_API_KEY
              </code>{" "}
              to .env.local, then restart{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                bun dev
              </code>
            </p>
            <a
              href={OPENROUTER_KEYS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs bg-red-500/10 p-1 px-2 rounded-md font-medium text-primary hover:underline"
            >
              Get key
            </a>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-2">
          <Button
            onClick={() => void create()}
            disabled={isCreating}
            size="lg"
            className="gap-2"
          >
            {isCreating ? (
              <FetchLoader size="sm" />
            ) : (
              <Plus className="size-4" />
            )}
            <span className="hidden sm:inline">New Notebook</span>
            <span className="sm:hidden">New</span>
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size={"icon-lg"}
                  variant={"secondary"}
                  className="relative ring-4 ring-border/40  rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatar} alt={name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs uppercase font-medium">
                      {name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {name}
                  </p>
                  <p
                    className="text-xs leading-none text-muted-foreground truncate"
                    title={email}
                  >
                    {email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span>Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                        onClick={() => setTheme("light")}
                        className="gap-2"
                      >
                        <Sun className="h-4 w-4" />
                        <span>Light</span>
                        {theme === "light" && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setTheme("dark")}
                        className="gap-2"
                      >
                        <Moon className="h-4 w-4" />
                        <span>Dark</span>
                        {theme === "dark" && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setTheme("system")}
                        className="gap-2"
                      >
                        <Laptop className="h-4 w-4" />
                        <span>System</span>
                        {theme === "system" && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={
                  <a
                    href={APP_GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center gap-2"
                  />
                }
              >
                <Icon icon={"line-md:github-twotone"} className="size-5" />

                <span>GitHub</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:bg-destructive/10! focus:text-destructive! gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
