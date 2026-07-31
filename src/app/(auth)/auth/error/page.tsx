"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const AuthErrorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error =
    searchParams.get("error") ||
    "An unexpected error occurred during authentication.";

  return (
    <Card className="w-full max-w-md border-0 bg-transparent shadow-none">
      <CardHeader className="text-center px-0">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
          <AlertCircle className="w-7 h-7 md:w-8 md:h-8 text-destructive" />
        </div>
        <CardTitle className="text-xl md:text-2xl font-semibold text-destructive tracking-tight">
          Authentication Error
        </CardTitle>
        <CardDescription className="text-sm md:text-base text-muted-foreground mt-2">
          Something went wrong while verifying your account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 md:space-y-6 px-0">
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 md:p-4 text-xs md:text-sm text-destructive font-medium text-center">
          {error}
        </div>

        <div className="space-y-3 pt-2">
          <Button
            onClick={() => router.push("/auth")}
            className="w-full h-11 text-sm md:text-base font-medium"
          >
            Back to Sign In
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="w-full flex items-center justify-center gap-2 text-sm md:text-base text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const AuthErrorPage = () => {
  return (
    <Suspense
      fallback={
        <div className="text-center font-medium animate-pulse">
          Verifying error details...
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
};

export default AuthErrorPage;
