import { Header } from "@/components/header";
import { isOpenRouterConfigured } from "@/lib/ai/openrouter-config";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <Header showOpenRouterHint={!isOpenRouterConfigured()} />
      <div className="flex-1 min-h-0 relative overflow-hidden">{children}</div>
    </div>
  );
}
