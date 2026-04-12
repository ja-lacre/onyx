"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const chartData = [
  { name: "Monday", volume: 180 },
  { name: "Tuesday", volume: 350 },
  { name: "Wednesday", volume: 450 },
  { name: "Thursday", volume: 300 },
  { name: "Friday", volume: 400 },
  { name: "Saturday", volume: 320 },
  { name: "Sunday", volume: 180 },
];

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      {}
      <div>
        <h1 className="text-3xl font-bold text-[#1B4D3E]">
          Dashboard Overview
        </h1>
        <p className="text-gray-500 mt-2">
          Monitor your queuing system performance and statistics
        </p>
      </div>

      {}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers Today
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#1B4D3E]">304</div>
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Services
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#1B4D3E]">95</div>
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Waiting Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#1B4D3E]">3 mins</div>
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Queue Length
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#1B4D3E]">48</div>
          </CardContent>
        </Card>
      </div>

      {}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl font-bold text-[#1B4D3E]">
            Weekly Queue Volume
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {}
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
                {}
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                {}
                <Bar dataKey="volume" fill="#4A8B7F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
