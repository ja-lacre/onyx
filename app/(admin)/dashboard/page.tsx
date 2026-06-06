// src/app/(admin)/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  getDashboardStats,
  getQueues,
  getWeeklyQueueVolume,
} from "@/utils/queue-service";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardStats {
  totalCustomersToday: number;
  completedServices: number;
  currentQueueLength: number;
  averageWaitTime: string;
}

export default function DashboardOverviewPage() {
  const supabase = useMemo(() => createClient(), []);
  const [queues, setQueues] = useState<any[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, DashboardStats>>({});
  const [chartDataMap, setChartDataMap] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const router = useRouter();

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!user || profile?.role !== "admin") {
        router.push("/home");
        return;
      }

      const allQueues = await getQueues(supabase);
      setQueues(allQueues);

      const statsResults: any = {};
      const chartResults: any = {};

      await Promise.all(
        allQueues.map(async (q) => {
          const [stats, volume] = await Promise.all([
            getDashboardStats(supabase, q.id),
            getWeeklyQueueVolume(supabase, q.id),
          ]);
          statsResults[q.id] = stats;
          chartResults[q.id] = volume;
        }),
      );

      setStatsMap(statsResults);
      setChartDataMap(chartResults);
      setIsLoading(false);
    };
    fetchAllData();
  }, [supabase, router]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4 md:p-8">
        <Loader2 className="h-10 w-10 animate-spin text-[#1B4D3E]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1B4D3E]">
            Dashboard Overview
          </h1>
          <p className="text-gray-500 mt-2">
            Monitor all service queues in one place
          </p>
        </div>

        {/* ✨ UPDATED: Added hover:-translate-y-2 and hover:shadow-xl to match other cards */}
        {currentTime && (
          <div className="flex items-center gap-5 bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-200/70 animate-in fade-in zoom-in-95 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl cursor-default">
            {/* Time Section */}
            <div className="flex flex-col items-end pr-5 border-r border-gray-100">
              <span className="text-2xl font-black text-[#1B4D3E] tracking-tight tabular-nums leading-none">
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                Local Time
              </span>
            </div>

            {/* Date Section */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 bg-[#E8F3E8] rounded-full">
                <Calendar className="h-5 w-5 text-[#1B4D3E]" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-800 leading-tight">
                  {currentTime.toLocaleDateString([], { weekday: "long" })}
                </span>
                <span className="text-xs font-medium text-gray-500 mt-0.5">
                  {currentTime.toLocaleDateString([], {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {queues.map((q) => {
        const stats = statsMap[q.id];
        const chartData = chartDataMap[q.id];

        return (
          <section
            key={q.id}
            className="space-y-4 animate-in slide-in-from-bottom-4 duration-500"
          >
            <h2 className="text-xl font-bold text-[#1B4D3E] border-b pb-2">
              {q.name}
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Total Customers",
                  val: stats?.totalCustomersToday,
                  icon: Users,
                },
                {
                  title: "Completed",
                  val: stats?.completedServices,
                  icon: CheckCircle,
                },
                { title: "Avg Wait", val: stats?.averageWaitTime, icon: Clock },
                {
                  title: "Current Length",
                  val: stats?.currentQueueLength,
                  icon: AlertTriangle,
                },
              ].map((item, i) => (
                <Card
                  key={i}
                  className="transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-default"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {item.title}
                    </CardTitle>
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-[#1B4D3E]">
                      {item.val}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="p-6 transition-all duration-300 hover:shadow-lg">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "#f1f5f9" }} />
                    <Bar
                      dataKey="volume"
                      fill="#1B4D3E"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
