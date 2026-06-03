// src/components/dashboard/sidebar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  PanelLeft,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client"; 

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Queue Management", href: "/queue-management", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

interface AdminProfile {
    email: string;
    name: string;
    avatar_url: string | null;
}

export function Sidebar({ isSidebarOpen, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
            // 1. Fetch profile from public.users table
            const { data: profileData } = await supabase
                .from('users')
                .select('preferred_name, first_name, avatar_url')
                .eq('user_id', authUser.id)
                .single();

            // 2. Map data to state
            if (profileData) {
                setProfile({
                    email: authUser.email || "N/A",
                    name: profileData.preferred_name || profileData.first_name || "Admin User",
                    avatar_url: profileData.avatar_url,
                });
            } else {
                // Fallback if profile row isn't found
                setProfile({
                    email: authUser.email || "N/A",
                    name: "Admin User",
                    avatar_url: null,
                });
            }
        }
        setIsLoading(false);
    };

    fetchUserData();
  }, [supabase]);

  // 5. LOGOUT HANDLER
  const handleLogout = async () => {
     const confirmed = window.confirm("Are you sure you want to log out?");
    
    if (confirmed) {
      await supabase.auth.signOut();
      
      router.push("/");
      router.refresh();
    }
  };

  if (isLoading) {
    return (
        <aside 
            className={cn(
                "bg-[#1B4D3E] text-white flex flex-col shadow-lg duration-300 ease-in-out z-10 p-4",
                isSidebarOpen ? "w-64" : "w-[70px] items-center"
            )}
        >
            <div className="mt-auto p-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-white/50" />
            </div>
        </aside>
    );
  }

  const userInitials = profile?.name ? profile.name.split(' ').map(n => n[0]).join('') : 'AD';
  
  return (
    <aside
      className={cn(
        "bg-[#1B4D3E] text-white flex flex-col shadow-lg transition-all duration-300 ease-in-out z-10 relative",
        isSidebarOpen ? "w-64" : "w-[70px] items-center"
      )}
    >
      {/* Header: Logo & Toggle Button */}
      <div
        className={cn(
          "flex items-center p-4 mb-2",
          isSidebarOpen ? "justify-between" : "justify-center"
        )}
      >
        {isSidebarOpen && (
          <div className="flex items-center transition-opacity duration-300">
            <div className="rounded-lg p-1.5 mr-3">
              <Image
                src="/logos/queuely_light_logo.svg"
                alt="Admin Logo"
                width={40}
                height={40}
              />
            </div>
            <span className="text-lg text-[30px] font-bold whitespace-nowrap text-[#E8F3E8]">Admin</span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-white/70 hover:text-white hover:bg-white/10"
          aria-label="Toggle Sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const LinkContent = (
            <Link
              href={item.href}
              className={cn(
                "flex items-center py-2.5 rounded-lg transition-colors group relative",
                isSidebarOpen ? "px-4" : "justify-center px-2",
                isActive
                  ? "bg-[#E8F3E8] text-[#1B4D3E]"
                  : "text-gray-300 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <item.icon className={cn("h-5 w-5", isSidebarOpen && "mr-3")} />
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap transition-all duration-300",
                  isSidebarOpen
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-2 absolute left-16 hidden"
                )}
              >
                {item.name}
              </span>
            </Link>
          );

          return isSidebarOpen ? (
            <div key={item.name}>{LinkContent}</div>
          ) : (
            <Tooltip key={item.name} delayDuration={0}>
              <TooltipTrigger asChild>{LinkContent}</TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1B4D3E] text-white border-white/10 font-medium ml-2">
                <p>{item.name}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* User Info Footer */}
      <div className="p-4 mt-auto">
        
        {isSidebarOpen && <Separator className="mb-4 bg-white/[0.1]" />}
        <div className={cn(
            "flex mt-auto",
            isSidebarOpen 
                ? "items-center justify-between" 
                : "flex-col items-center space-y-4" // Collapsed: Column, centered, with vertical spacing
        )}>
          <Link 
              href="/profile" 
              className={cn("flex items-center transition-all duration-300 group cursor-pointer",
                isSidebarOpen ? "space-x-3" : "justify-center flex-col space-y-4",
                isSidebarOpen ? "hover:bg-white/10 p-2 rounded-lg -m-2" : "p-0"
            )}
          >
            <Avatar className="border-2 border-white/10">
              <AvatarImage src={profile?.avatar_url || "https://github.com/shadcn.png"} alt={profile?.name || "Admin"} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>

            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate">{profile?.name || "Admin User"}</p>
                <p className="text-xs text-gray-400 truncate">
                  {profile?.email || "loading..."}
                </p>
              </div>
            )}
          </Link>
            {/* Logout button (FULL SIZE) */}
            {isSidebarOpen ? (
                <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:bg-white/[0.08] hover:text-white shrink-0"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            ) : (
              
                <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:bg-white/[0.08] hover:text-white shrink-0 mt-2"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1B4D3E] text-white border-white/10 font-medium ml-2">Logout</TooltipContent>
              </Tooltip>
            )}
          </div>
      </div>
    </aside>
  );
}