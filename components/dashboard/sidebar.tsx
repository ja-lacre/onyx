"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  PanelLeft,
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

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Queue Management", href: "/queue-management", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ isSidebarOpen, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "bg-[#0A1D56] text-white flex flex-col shadow-lg transition-all duration-300 ease-in-out z-10 relative",
        isSidebarOpen ? "w-64" : "w-[70px] items-center",
      )}
    >
      {}
      <div
        className={cn(
          "flex items-center p-4 mb-2",
          isSidebarOpen ? "justify-between" : "justify-center",
        )}
      >
        {}
        {isSidebarOpen && (
          <div className="flex items-center transition-opacity duration-300">
            <div className="bg-white rounded-lg p-1.5 mr-3">
              {}
              <Image
                src="/images/logo.svg"
                alt="Admin Logo"
                width={20}
                height={20}
              />
            </div>
            <span className="text-lg font-bold whitespace-nowrap">Admin</span>
          </div>
        )}

        {}
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

      {}
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
                  ? "bg-[#2F55D4] text-white"
                  : "text-gray-300 hover:bg-white/[0.08] hover:text-white",
              )}
            >
              <item.icon className={cn("h-5 w-5", isSidebarOpen && "mr-3")} />
              {}
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
              {}
              <TooltipContent
                side="right"
                className="bg-[#0A1D56] text-white border-white/10 font-medium ml-2"
              >
                <p>{item.name}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {}
      <div className="p-4 mt-auto">
        {isSidebarOpen && <Separator className="mb-4 bg-white/[0.1]" />}
        <div
          className={cn(
            "flex items-center transition-all duration-300",
            isSidebarOpen ? "space-x-3" : "justify-center flex-col space-y-4",
          )}
        >
          <Avatar className="border-2 border-white/10">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CA</AvatarFallback>
          </Avatar>

          {}
          {isSidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">Cartethyia</p>
              <p className="text-xs text-gray-400 truncate">
                smolcarte@gmail.com
              </p>
            </div>
          )}

          {}
          {isSidebarOpen ? (
            <Button
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
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:bg-white/[0.08] hover:text-white shrink-0 mt-2"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-[#0A1D56] text-white border-white/10 font-medium ml-2"
              >
                Logout
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </aside>
  );
}
