"use client";
import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ResetPasswordPage = () => {
  const router = useRouter();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      // 1. Check if we already have a session (e.g. verified by Proxy)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setIsVerified(true);
        return;
      }

      // 2. Fallback to token from URL (Implicit flow style)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);

      const accessToken =
        hashParams.get("access_token") || urlParams.get("access_token");
      const refreshToken =
        hashParams.get("refresh_token") || urlParams.get("refresh_token");
      const type = hashParams.get("type") || urlParams.get("type");

      if (type === "recovery" && accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setError("Invalid or expired reset link.");
          } else {
            setIsVerified(true);
          }
        } catch (err) {
          console.error("Token verification error:", err);
          setError("Failed to verify reset link.");
        }
      } else {
        setError("Invalid or missing reset token.");
      }
    };

    verifyToken();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!isVerified) {
      setError("Session not verified. Please use a valid reset link.");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError(error.message);
      } else {
        setIsSuccess(true);
        toast.success("Password updated successfully!", {
          description: "You can now sign in with your new password.",
        });

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/notebook");
        }, 2500);
      }
    } catch (err) {
      console.error("Update password error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !isVerified) {
    return (
      <Card className=" ring-0! border-none! bg-transparent! w-full p-5 text-center">
        <CardHeader className="px-0">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
            <AlertCircle className="w-7 h-7 md:w-8 md:h-8 text-destructive" />
          </div>
          <CardTitle className="text-xl md:text-2xl tracking-tight">
            Invalid Link
          </CardTitle>
          <CardDescription className="text-sm md:text-base mt-2">
            This reset link is invalid or has expired
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          <Alert variant="destructive" className="mb-4 md:mb-6">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push("/auth")}
            className="w-full h-11 shadow-sm"
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className=" ring-0! border-none! bg-transparent! w-full p-5 text-center">
        <CardHeader className="px-0">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
            <CheckCircle className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          </div>
          <CardTitle className="text-xl md:text-2xl text-primary tracking-tight">
            Secure & Ready!
          </CardTitle>
          <CardDescription className="text-sm md:text-base mt-2">
            Your password has been updated
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          <p className="text-sm md:text-base text-muted-foreground text-center mb-6 md:mb-8 leading-relaxed">
            Your credentials are now up to date. We are taking you to your
            dashboard now...
          </p>
          <Button
            onClick={() => router.push("/notebook")}
            className="w-full h-11 shadow-sm"
          >
            Continue to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className=" ring-0! border-none! bg-transparent! w-full p-5">
      <CardHeader className="px-0 pt-0 pb-6 md:pb-8 text-left">
        <CardTitle className="text-xl md:text-2xl mb-2 tracking-tight">
          New Password
        </CardTitle>
        <CardDescription className="text-sm md:text-base">
          Set a new password for your LibreNote AI account.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div className="space-y-3 md:space-y-4">
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              required
              className="h-11"
              disabled={isLoading || !isVerified}
            />
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="h-11"
              disabled={isLoading || !isVerified}
            />
          </div>

          {/* Password Requirements */}
          <Card className=" ring-0! border-none! bg-transparent! w-full p-5">
            <CardContent className="p-4">
              <h4 className="text-xs font-semibold mb-3 tracking-wider uppercase opacity-70">
                Security Checklist
              </h4>
              <div className="space-y-2">
                <div
                  className={`flex items-center gap-3 text-xs ${
                    newPassword.length >= 6
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      newPassword.length >= 6
                        ? "bg-primary shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                  At least 6 characters
                </div>
                <div
                  className={`flex items-center gap-3 text-xs ${
                    newPassword &&
                    confirmPassword &&
                    newPassword === confirmPassword
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      newPassword &&
                      confirmPassword &&
                      newPassword === confirmPassword
                        ? "bg-primary shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                  Passwords match
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert
              variant="destructive"
              className="animate-in fade-in duration-300"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs md:text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {!isVerified && (
            <div className="flex items-center justify-center gap-2 md:gap-3 py-3 md:py-4 text-primary animate-pulse">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs md:text-sm font-semibold tracking-wide uppercase">
                Verifying link
              </span>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={
              isLoading || !newPassword || !confirmPassword || !isVerified
            }
            className="w-full h-11 shadow-sm"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                Updating security...
              </div>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ResetPasswordPage;
