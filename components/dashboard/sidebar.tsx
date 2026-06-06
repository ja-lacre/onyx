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

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: profileData } = await supabase
          .from("users")
          .select("preferred_name, first_name, avatar_url")
          .eq("user_id", authUser.id)
          .single();

        if (profileData) {
          setProfile({
            email: authUser.email || "N/A",
            name:
              profileData.preferred_name ||
              profileData.first_name ||
              "Admin User",
            avatar_url: profileData.avatar_url,
          });
        } else {
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

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsLogoutModalOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout Error:", error);
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <aside
        className={cn(
          // ✨ FIX: We use h-full to explicitly fill the flex wrapper
          "bg-[#1B4D3E] text-white flex flex-col shadow-lg duration-300 ease-in-out z-40 p-4 h-full",
          isSidebarOpen ? "w-64" : "w-[70px] items-center",
        )}
      >
        <div className="mt-auto p-4 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-white/50" />
        </div>
      </aside>
    );
  }

  const userInitials = profile?.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "AD";

  return (
    <>
      <aside
        className={cn(
          // ✨ FIX: We use h-full here too so it never shrinks
          "bg-[#1B4D3E] text-white flex flex-col shadow-lg transition-all duration-300 ease-in-out z-40 h-full relative",
          isSidebarOpen ? "w-64" : "w-[70px] items-center",
        )}
      >
        <div
          className={cn(
            "flex items-center p-4 mb-2",
            isSidebarOpen ? "justify-between" : "justify-center",
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
              <span className="text-lg text-[30px] font-bold whitespace-nowrap text-[#E8F3E8]">
                Admin
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="cursor-pointer text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Toggle Sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-2 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const LinkContent = (
              <Link
                href={item.href}
                className={cn(
                  "cursor-pointer flex items-center py-2.5 rounded-lg transition-colors group relative",
                  isSidebarOpen ? "px-4" : "justify-center px-2",
                  isActive
                    ? "bg-[#E8F3E8] text-[#1B4D3E]"
                    : "text-gray-300 hover:bg-white/[0.08] hover:text-white",
                )}
              >
                <item.icon className={cn("h-5 w-5", isSidebarOpen && "mr-3")} />
                <span
                  className={cn(
                    "text-sm font-medium whitespace-nowrap transition-all duration-300",
                    isSidebarOpen
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-2 absolute left-16 hidden",
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
                <TooltipContent
                  side="right"
                  className="bg-[#1B4D3E] text-white border-white/10 font-medium ml-2"
                >
                  <p>{item.name}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          {isSidebarOpen && <Separator className="mb-4 bg-white/[0.1]" />}
          <div
            className={cn(
              "flex mt-auto",
              isSidebarOpen
                ? "items-center justify-between"
                : "flex-col items-center space-y-4",
            )}
          >
            <Link
              href="/admin-profile"
              className={cn(
                "flex items-center transition-all duration-300 group cursor-pointer",
                isSidebarOpen
                  ? "space-x-3"
                  : "justify-center flex-col space-y-4",
                isSidebarOpen ? "hover:bg-white/10 p-2 rounded-lg -m-2" : "p-0",
              )}
            >
              <Avatar className="border-2 border-white/10">
                <AvatarImage
                  src={profile?.avatar_url || "https://github.com/shadcn.png"}
                  alt={profile?.name || "Admin"}
                />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>

              {isSidebarOpen && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold truncate">
                    {profile?.name || "Admin User"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {profile?.email || "loading..."}
                  </p>
                </div>
              )}
            </Link>
            {isSidebarOpen ? (
              <Button
                onClick={() => setIsLogoutModalOpen(true)}
                variant="ghost"
                size="icon"
                className="cursor-pointer text-gray-400 hover:bg-white/[0.08] hover:text-white shrink-0"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            ) : (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setIsLogoutModalOpen(true)}
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer text-gray-400 hover:bg-white/[0.08] hover:text-white shrink-0 mt-2"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-[#1B4D3E] text-white border-white/10 font-medium ml-2"
                >
                  Logout
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className={cn(
              "cursor-pointer absolute inset-0 bg-black/60 backdrop-blur-sm duration-300",
              isClosing ? "animate-out fade-out" : "animate-in fade-in",
            )}
            onClick={() => !isLoggingOut && handleCloseModal()}
          ></div>

          <div
            className={cn(
              "bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 duration-300 ease-out",
              isClosing
                ? "animate-out fade-out zoom-out-95"
                : "animate-in fade-in zoom-in-95",
            )}
          >
            <div className="p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
                <LogOut className="h-6 w-6 text-red-800" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Sign Out</h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to log out of your Admin account?
              </p>
            </div>

            <div className="p-4 flex gap-3 bg-gray-50 border-t border-gray-100">
              <Button
                onClick={handleCloseModal}
                variant="outline"
                className="cursor-pointer flex-1 font-bold text-gray-600 border-gray-200 hover:bg-gray-100"
                disabled={isLoggingOut}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogout}
                className="cursor-pointer flex-1 font-bold bg-red-800 hover:bg-red-900 text-white shadow-md transition-colors"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  "Log Out"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
