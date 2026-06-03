// src/app/(auth)/login/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from 'next/image';

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"


export default function LoginPage() {
  const router = useRouter();
  // 2. Create Supabase client
  const supabase = createClient();

  // 3. Define state for form inputs, loading status, and errors
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 4. The function that handles form submission
 const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // 1. Log in (Authentication - ONLY ONE CALL)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (authError) {
        setErrorMessage(authError.message);
        setIsLoading(false);
        return;
    }

    // 2. If login successful, fetch user role (Authorization)
    if (authData.user) {
        // --- NOTE: If you decide to rely 100% on middleware, you can skip this profile fetch ---
        // For a seamless Admin redirect, keeping this client-side check is often better UX.
        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('role')
            .eq('user_id', authData.user.id)
            .single();

        if (profileError) {
            setErrorMessage("Could not fetch user role. Check RLS on 'users' table.");
            await supabase.auth.signOut();
            setIsLoading(false);
            return;
        }

        // 3. Definitive Redirect based on role
        router.refresh(); // Important: Refreshes server components to pick up new session
        
        if (profileData?.role === 'admin') {
            router.push("/dashboard");
        } else {
            router.push("/home");
        }
    }

    setIsLoading(false); // Ensure loading state is turned off after all redirects/errors
};

  return (
    // Main Container: Overall light green background
    <div className="w-full min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#E8F3E8]">

      {/* LEFT SIDE: Branding Text (Unchanged) */}
      <div className="hidden md:flex flex-col justify-center items-start p-8 lg:p-12 xl:p-16 text-[#1B4D3E]">
        {/* Header: Scales from 5xl -> 7xl -> 100px */}
        <h1 className="text-5xl lg:text-7xl xl:text-[100px] font-bold mb-4 lg:mb-6 flex items-center gap-3 lg:gap-5 transition-all duration-300">
          <Image 
            src="/logos/queuely_logo.svg"  
            alt="Queuely Logo"
            /* IMPORTANT: Set these to the LARGEST size you expect (160px) to prevent blur */
            width={160}
            height={160}
            /* Responsive sizing: h-16 (small) -> h-24 (med) -> h-40 (large) */
            className="h-16 w-16 lg:h-24 lg:w-24 xl:h-40 xl:w-40 object-contain" 
          />
          Queuely
        </h1>

        {/* Subtitle: Scales from lg -> xl -> 2xl */}
        <p className="text-lg lg:text-xl xl:text-2xl font-medium max-w-md lg:max-w-2xl">
          Modern queue management for services and businesses
        </p>
      </div>

      {/* RIGHT SIDE: The Login Card */}
      <div className="flex items-center justify-center p-4 md:p-8">

        {/* THE CARD */}
        <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8">

          {/* Card Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[#1B4D3E]">Welcome Back</h2>
            <p className="text-gray-500 mt-3">
              Sign in to access and manage your queues
            </p>
          </div>

          {/* Form - 5. Attach the submit handler */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* CHANGED: Username Field to Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1B4D3E] font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email" // Changed type to email
                placeholder="Enter your email"
                // 6. Bind value and onChange to state
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="py-6 bg-gray-100/50 border-gray-200 rounded-xl focus-visible:ring-[#1B4D3E] focus-visible:ring-offset-0"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1B4D3E] font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                // 6. Bind value and onChange to state
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="py-6 bg-gray-100/50 border-gray-200 rounded-xl focus-visible:ring-[#1B4D3E] focus-visible:ring-offset-0"
                required
              />
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              // 7. Disable button while loading
              disabled={isLoading}
              className="w-full py-6 text-lg font-semibold bg-[#1B4D3E] hover:bg-[#153a2f] text-white rounded-xl mt-4 disabled:opacity-70"
            >
              {/* Change text based on loading state */}
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          
          {/* Error Alert Message */}
            {errorMessage && (
              <Alert variant="destructive" className="bg-red-50 text-red-600 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
              )}
            
          {/* Card Footer Links (Unchanged) */}
          <div className="text-center space-y-4 text-sm text-gray-600">
            <p>
              Dont have account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-[#1B4D3E] hover:underline"
              >
                Sign up
              </Link>
            </p>
            <Link
              href="/forgot-password"
              className="block font-semibold text-[#1B4D3E] hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}