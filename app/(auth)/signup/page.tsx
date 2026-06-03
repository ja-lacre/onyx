// src/app/(auth)/signup/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Image from 'next/image';

export default function SignupPage() {
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    
    // State variables for name fields
    const [preferredName, setPreferredName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        // 1. AUTHENTICATION: Create the login record and pass metadata to the trigger
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            // START: IMPORTANT - Pass name data as metadata
            options: {
                data: {
                    preferred_name: preferredName,
                    first_name: firstName,
                    last_name: lastName,
                }
            }
            // END: IMPORTANT
        });

        if (authError) {
            setErrorMessage(authError.message);
            setIsLoading(false);
            return;
        }

        // --- PROFILE CREATION (REMOVED: Database trigger handles this now) ---
        // We rely on the `handle_new_user` trigger to insert the profile.
        if (authData.user) {
             // In a real trigger, you would update your function to read:
             // NEW.raw_user_meta_data->>'first_name'
             // to get the passed values.
        }
      
        // --- SUCCESS LOGIC ---
        setSuccessMessage(
            "Success! Check your email to confirm your account and log in."
        );
      
        setEmail("");
        setPassword("");
        setPreferredName("");
        setFirstName("");
        setLastName("");
        
        setIsLoading(false);
        setTimeout(() => {
              setIsLoading(false); 
              router.push('/login'); 
          }, 1500);
    };

    return (
        // ... (JSX remains the same as your previous attempt, only the logic changed)
        <div className="w-full min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#E8F3E8]">
            {/* LEFT SIDE: Branding Text */}
            <div className="hidden md:flex flex-col justify-center items-start p-8 lg:p-12 xl:p-16 text-[#1B4D3E]">
            <h1 className="text-5xl lg:text-7xl xl:text-[100px] font-bold mb-4 lg:mb-6 flex items-center gap-3 lg:gap-5 transition-all duration-300">
                <Image 
                src="/logos/queuely_logo.svg" alt="Queuely Logo"
                width={160} height={160}
                className="h-16 w-16 lg:h-24 lg:w-24 xl:h-40 xl:w-40 object-contain" 
                />
                Queuely
            </h1>
                <p className="text-lg lg:text-xl xl:text-2xl font-medium max-w-md lg:max-w-2xl">
                Modern queue management for services and businesses
                </p>
            </div>

            {/* RIGHT SIDE: The Sign Up Card */}
            <div className="flex items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8">
                
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-[#1B4D3E]">Create Account</h2>
                    <p className="text-gray-500 mt-3">
                    Get started with Queuely today
                    </p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-6">
                    
                    {/* Preferred Name Field */}
                    <div className="space-y-2">
                    <Label htmlFor="preferredName" className="text-[#1B4D3E] font-medium">Preferred Name</Label>
                    <Input
                        id="preferredName" type="text" placeholder="What you prefer to be called"
                        value={preferredName} onChange={(e) => setPreferredName(e.target.value)}
                        className="py-6 bg-gray-100/50 border-gray-200 rounded-xl focus-visible:ring-[#1B4D3E] focus-visible:ring-offset-0"
                        required
                    />
                    </div>
                    
                    {/* First/Last Name Fields in a grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-[#1B4D3E] font-medium">First Name</Label>
                            <Input
                            id="firstName" type="text" placeholder="Legal first name"
                            value={firstName} onChange={(e) => setFirstName(e.target.value)}
                            className="py-6 bg-gray-100/50 border-gray-200 rounded-xl focus-visible:ring-[#1B4D3E] focus-visible:ring-offset-0"
                            required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-[#1B4D3E] font-medium">Last Name</Label>
                            <Input
                            id="lastName" type="text" placeholder="Legal last name"
                            value={lastName} onChange={(e) => setLastName(e.target.value)}
                            className="py-6 bg-gray-100/50 border-gray-200 rounded-xl focus-visible:ring-[#1B4D3E] focus-visible:ring-offset-0"
                            required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                    <Label htmlFor="email" className="text-[#1B4D3E] font-medium">Email</Label>
                    <Input
                        id="email" type="email" placeholder="Enter your email"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        className="py-6 bg-gray-100/50 border-gray-200 rounded-xl focus-visible:ring-[#1B4D3E] focus-visible:ring-offset-0"
                        required
                    />
                    </div>

                    <div className="space-y-2">
                    <Label htmlFor="password" className="text-[#1B4D3E] font-medium">Password</Label>
                    <Input
                        id="password" type="password" placeholder="Create a password"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className="py-6 bg-gray-100/50 border-gray-200 rounded-xl focus-visible:ring-[#1B4D3E] focus-visible:ring-offset-0"
                        required
                    />
                    </div>

                    <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-6 text-lg font-semibold bg-[#1B4D3E] hover:bg-[#153a2f] text-white rounded-xl mt-4 disabled:opacity-70"
                    >
                    {isLoading ? "Creating Account..." : "Sign Up"}
                    </Button>
                </form>
                
                {/* Messages */}
                {errorMessage && (
                    <Alert variant="destructive" className="bg-red-50 text-red-600 border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}

                {successMessage && (
                    <Alert variant="default" className="bg-green-50 text-[#1B4D3E] border-[#A8D3B8]">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                )}
                    
                <div className="text-center space-y-4 text-sm text-gray-600">
                    <p>
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="font-semibold text-[#1B4D3E] hover:underline"
                    >
                        Sign in
                    </Link>
                    </p>
                </div>
                </div>
            </div>
        </div>
    );
}