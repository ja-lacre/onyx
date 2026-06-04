"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from 'next/image';
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // 🔒 SECURITY CHECK: Enforce 8-character minimum password length
    if (password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters long." });
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Password updated successfully! Redirecting to login..." });
      setTimeout(() => {
        router.push("/login");
      }, 2000);
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
            <h2 className="text-3xl font-bold text-[#1B4D3E]">Set New Password</h2>
            <p className="text-gray-500 mt-3">
              Please enter a new, secure password for your account.
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1B4D3E] font-medium">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="py-6 bg-gray-100/50 border-gray-200 rounded-xl focus-visible:ring-[#1B4D3E] focus-visible:ring-offset-0"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || message?.type === "success"}
              className="w-full py-6 text-lg font-semibold bg-[#1B4D3E] hover:bg-[#153a2f] text-white rounded-xl mt-4 disabled:opacity-70"
            >
              {isLoading ? "Updating..." : "Update Password"}
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
        </div>
      </div>
    </div>
  );
}