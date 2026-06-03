"use client";

import Link from "next/link";
import Image from "next/image";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client"; 
import { useRouter } from "next/navigation";

export function UserTopbar() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    
    if (confirmed) {
      await supabase.auth.signOut();
    
      router.push("/login");
      router.refresh();
    } 
  };

  return (
    <header className="max-w-md mx-auto flex items-center justify-between mb-8">
      {/* Logo and App Name */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 relative">
          {/* Make sure this file exists in public/logos/ */}
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
            className="text-[#1B4D3E] hover:bg-[#1B4D3E] hover:text-white"
          >
            <User className="h-6 w-6" />
            <span className="sr-only">Profile</span>
          </Button>
        </Link>
        
        {/* Real Logout Button */}
        <Button
          onClick={handleLogout} // <--- Added this
          variant="ghost"
          size="icon"
          className="text-[#1B4D3E] hover:bg-[#1B4D3E] hover:text-white"
        >
          <LogOut className="h-6 w-6" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  );
}