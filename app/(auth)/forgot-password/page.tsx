"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from 'next/image';
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Check your email for the password reset link." });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="w-full min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#E8F3E8]">
      {/* LEFT SIDE: Branding Text */}
      <div className="hidden md:flex flex-col justify-center items-start p-8 lg:p-12 xl:p-16 text-[#1B4D3E]">
        <h1 className="text-5xl lg:text-7xl xl:text-[100px] font-bold mb-4 lg:mb-6 flex items-center gap-3 lg:gap-5 transition-all duration-300">
          <Image 
            src="/logos/queuely_logo.svg"  
            alt="Queuely Logo"
            width={160}
            height={160}
            className="h-16 w-16 lg:h-24 lg:w-24 xl:h-40 xl:w-40 object-contain" 
          />
          Queuely
        </h1>
        <p className="text-lg lg:text-xl xl:text-2xl font-medium max-w-md lg:max-w-2xl">
          Modern queue management for services and businesses
        </p>
      </div>

      {/* RIGHT SIDE: The Form Card */}
      <div className="flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8">
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[#1B4D3E]">Reset Password</h2>
            <p className="text-gray-500 mt-3">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1B4D3E] font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="py-6 bg-gray-100/50 border-gray-200 rounded-xl focus-visible:ring-[#1B4D3E] focus-visible:ring-offset-0"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-6 text-lg font-semibold bg-[#1B4D3E] hover:bg-[#153a2f] text-white rounded-xl mt-4 disabled:opacity-70"
            >
              {isLoading ? "Sending link..." : "Send Reset Link"}
            </Button>
          </form>

          {/* Status Alerts */}
          {message?.type === "error" && (
            <Alert variant="destructive" className="bg-red-50 text-red-600 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          
          {message?.type === "success" && (
            <Alert className="bg-[#E8F3E8] text-[#1B4D3E] border-[#1B4D3E]/20">
              <CheckCircle2 className="h-4 w-4 !text-[#1B4D3E]" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-4 text-sm text-gray-600">
            <p>
              Remember your password?{" "}
              <Link href="/login" className="font-semibold text-[#1B4D3E] hover:underline">
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}