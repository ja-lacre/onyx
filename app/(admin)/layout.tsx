"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <TooltipProvider>
      {/* ✨ FIX: Changed min-h-screen to h-screen to lock the layout! */}
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

        {/* Main content wrapper */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />

          {/* This main tag handles the scrolling because of overflow-y-auto! */}
          <main className="flex-1 p-6 md:p-8 overflow-y-auto overflow-x-hidden bg-gray-50/50 relative">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
