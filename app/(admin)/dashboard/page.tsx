// src/app/(dashboard)/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { getDashboardStats } from "@/utils/queue-service";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// 1. Sample data for the Weekly Queue Volume Chart
const chartData = [
  { name: "Monday", volume: 180 },
  { name: "Tuesday", volume: 350 },
  { name: "Wednesday", volume: 450 },
  { name: "Thursday", volume: 300 },
  { name: "Friday", volume: 400 },
  { name: "Saturday", volume: 320 },
  { name: "Sunday", volume: 180 },
];

interface DashboardStats {
    totalCustomersToday: number;
    completedServices: number;
    currentQueueLength: number;
    averageWaitTime: string;
}

export default function DashboardOverviewPage() {
    const supabase = useMemo(() => createClient(), []);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                // FIX: Call the new helper function
                const dashboardStats = await getDashboardStats(supabase);
                setStats(dashboardStats);
            } catch (error) {
                console.error("Error fetching dashboard statistics:", error);
                // Optionally show a default or zeroed stats card on error
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [supabase]);

    // --- RENDER BLOCKING ---
    if (isLoading || !stats) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#1B4D3E]" />
            </div>
        );
  }
  
  return (
    // Main page container with vertical spacing
    <div className="space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1B4D3E]">
          Dashboard Overview
        </h1>
        <p className="text-gray-500 mt-2">
          Monitor your queuing system performance and statistics
        </p>
      </div>

      {/* 2. Stats Cards Section (CSS Grid) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers Today
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#1B4D3E]">{stats.totalCustomersToday}</div>
          </CardContent>
        </Card>

        {/* Card 2: Completed Services */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Services
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#1B4D3E]">{stats.completedServices}</div>
          </CardContent>
        </Card>

        {/* Card 3: Average Waiting Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Waiting Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#1B4D3E]">{stats.averageWaitTime}</div>
          </CardContent>
        </Card>

        {/* Card 4: Current Queue Length */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Queue Length
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#1B4D3E]">{stats.currentQueueLength}</div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Weekly Queue Volume Chart Section */}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl font-bold text-[#1B4D3E]">
            Weekly Queue Volume
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {/* Recharts ResponsiveContainer makes the chart fill the width */}
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                {/* Custom styling for the tooltip popover */}
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                {/* The actual bars, colored to match the theme */}
                <Bar dataKey="volume" fill="#1B4D3E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}