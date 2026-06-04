"use client";

import Link from "next/link";
import Image from "next/image";
import { User, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client"; 
import { useRouter } from "next/navigation";
import { useState } from "react"; // Added useState

export function UserTopbar() {
  const router = useRouter();
  const supabase = createClient();

  // --- NEW: Modal States ---
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // --- UPDATED: Secure Logout Function ---
  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error logging out:", error);
      setIsLoggingOut(false);
    } 
  };

  return (
    <>
      <header className="max-w-md mx-auto flex items-center justify-between mb-8">
        {/* Logo and App Name */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 relative">
            <Image
              src="/logos/queuely_logo.svg" 
              alt="Queuely Logo"
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#1B4D3E]">Queuely</h1>
        </div>

        {/* User Actions (Profile & Logout) */}
        <div className="flex items-center gap-2">
          <Link href="/profile">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer text-[#1B4D3E] hover:bg-[#1B4D3E] hover:text-white transition-colors"
            >
              <User className="h-6 w-6" />
              <span className="sr-only">Profile</span>
            </Button>
          </Link>
          
          {/* UPDATED: Triggers the Modal instead of window.confirm */}
          <Button
            onClick={() => setIsLogoutModalOpen(true)} 
            variant="ghost"
            size="icon"
            className="cursor-pointer text-[#1B4D3E] hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-6 w-6" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* --- SLEEK LOGOUT CONFIRMATION MODAL --- */}
      {/* ============================================================== */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Blurred Backdrop */}
            <div 
                className="cursor-pointer absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
                onClick={() => !isLoggingOut && setIsLogoutModalOpen(false)}
            ></div>
            
            {/* Modal Container */}
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-6 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
                        <LogOut className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Sign Out</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Are you sure you want to log out of your Queuely account?
                    </p>
                </div>

                <div className="p-4 flex gap-3 bg-gray-50 border-t border-gray-100">
                    <Button 
                        onClick={() => setIsLogoutModalOpen(false)} 
                        variant="outline" 
                        className="cursor-pointer flex-1 font-bold text-gray-600 border-gray-200 hover:bg-gray-100"
                        disabled={isLoggingOut}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleLogout} 
                        className="cursor-pointer flex-1 font-bold bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors"
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Log Out"}
                    </Button>
                </div>
            </div>
        </div>
      )}
    </>
  );
}