"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
} from "lucide-react";
import { Toaster } from "sonner";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        expand={true}
        closeButton={false}
        duration={4000}
        offset="32px"
        gap={10}
        theme="dark"
        icons={{
          success: <CheckCircle2 size={20} />,
          error: <AlertCircle size={20} />,
          warning: <AlertTriangle size={20} />,
          info: <Info size={20} />,
          loading: <RefreshCw size={20} className="animate-spin" />,
        }}
        toastOptions={{
          className: "sonnerLB-toast-shell sonnerLB-has-loader",
        }}
      />
    </QueryClientProvider>
  );
}
