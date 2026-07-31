"use client";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import Logo from "@/components/logo";
import { Label } from "@/components/ui/label";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setIsSubmitted(true);
      toast.success("Reset link sent successfully!");
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className=" ring-0! border-none! bg-transparent! w-full p-5">
      {!isSubmitted && (
        <CardHeader className="px-0 pt-0 pb-6 md:pb-8 text-left">
          <Button
            variant="ghost"
            onClick={() => router.push("/auth")}
            disabled={isLoading}
            className="w-fit mb-4 md:mb-6"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to login
          </Button>
          <Logo title={false} href="/" size={60} className="mb-4 md:mb-6" />

          <CardTitle className="text-xl md:text-2xl mb-2 tracking-tight">
            Reset Password
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            Enter your registered email address and we&apos;ll send you a link
            to reset your password.
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className="px-0">
        {!isSubmitted ? (
          <form
            onSubmit={handleResetPassword}
            className="space-y-4 md:space-y-6"
          >
            <div className="space-y-2">
              <Label className="text-sm ml-2 font-medium">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="h-11"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !email}
              className="w-full h-11 shadow-sm"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  Sending Link...
                </div>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-1000">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center ring-2 ring-primary/30 border border-primary/40 justify-center mb-4 md:mb-6">
              <CheckCircle className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            </div>
            <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 tracking-tight">
              Email Sent!
            </h3>
            <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 leading-relaxed">
              We&apos;ve sent a password reset link to{" "}
              <span className="font-semibold text-foreground">{email}</span>.
              Please check your inbox and spam folder.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => setIsSubmitted(false)}
                variant="outline"
                className="w-full h-11"
              >
                Try Different Email
              </Button>
              <Button
                onClick={() => router.push("/auth")}
                variant="ghost"
                className="w-full h-11 text-muted-foreground"
              >
                Return to Sign In
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ForgotPasswordPage;
