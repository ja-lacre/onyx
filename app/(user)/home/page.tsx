"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  User,
  LogOut,
  Users as UsersIcon,
  Clock as ClockIcon,
} from "lucide-react";
import { UserTopbar } from "@/components/user/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  getQueueMetrics,
  joinQueue,
  leaveQueue,
  formatTime,
} from "@/utils/queue-service";

export default function UserDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const user = { name: "Ricky" };

  const refreshQueueData = useCallback(
    async (ticket: any) => {
      if (!ticket) return;

      const metrics = await getQueueMetrics(
        supabase,
        ticket.service_name,
        ticket.created_at,
      );

      setActiveTicket((prev: any) => ({
        ...prev,
        ...ticket,
        id: ticket.id,
        number: ticket.ticket_number,
        currentPosition: metrics.position,
        totalInLine: metrics.totalInLine,
        estimatedWait: metrics.estimatedWait,
        serviceAround: metrics.serviceAround,
        priority: ticket.is_priority ? "Yes" : "No",
        joined: formatTime(ticket.created_at),
      }));
    },
    [supabase],
  );

  const handleGetNumber = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to join a queue!");
      setLoading(false);
      return;
    }

    try {
      const newTicket = await joinQueue(supabase, user.id, "Registrar");
      await refreshQueueData(newTicket);
    } catch (error) {
      console.error("Error joining queue:", error);
      alert("Could not join queue.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!activeTicket?.id) return;
    setLoading(true);

    try {
      await leaveQueue(supabase, activeTicket.id);
      setActiveTicket(null);
    } catch (error) {
      console.error("Error leaving queue:", error);
      alert("Failed to leave the queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchActiveTicket = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingTicket } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "waiting")
        .single();

      if (existingTicket) {
        refreshQueueData(existingTicket);
      }
    };

    fetchActiveTicket();
  }, [supabase, refreshQueueData]);

  return (
    <div className="min-h-screen bg-[#E8F3E8] p-4 md:p-8">
      {}
      <UserTopbar />

      {}
      <main className="max-w-md mx-auto space-y-6">
        <p className="text-lg text-[#1B4D3E] font-medium">Hello, {user.name}</p>

        {}
        {activeTicket ? (
          <>
            <Card className="max-w-md w-full bg-white border-none shadow-lg overflow-hidden rounded-2xl ring-1 ring-black/5 p-0">
              {}
              {}
              <div className="bg-[#1B4D3E] py-10 px-6 text-center">
                <h2 className="text-white/80 text-lg font-medium mb-1 tracking-wide">
                  Your Ticket Number
                </h2>
                <div className="text-7xl font-bold text-white tracking-tight">
                  {activeTicket.number}
                </div>
              </div>

              {}
              <CardContent className="p-6 space-y-6">
                {}
                <div className="bg-[#E8F5E9] rounded-xl p-6 flex flex-col items-center justify-center text-center border border-[#1B4D3E]/10">
                  <p className="text-[#1B4D3E] font-semibold flex items-center gap-2 mb-1">
                    <UsersIcon className="h-5 w-5" />
                    Current Position
                  </p>
                  <div className="text-4xl font-bold text-[#1B4D3E]">
                    {activeTicket.currentPosition}
                  </div>
                  <p className="text-sm text-[#1B4D3E]/60 font-medium">
                    of {activeTicket.totalInLine} people in line
                  </p>
                </div>

                <div className="bg-[#E8F5E9] rounded-xl p-6 flex flex-col items-center justify-center text-center border border-[#1B4D3E]/10">
                  <p className="text-[#1B4D3E] font-semibold flex items-center gap-2 mb-1">
                    <ClockIcon className="h-5 w-5" />
                    Estimated Time Wait
                  </p>
                  <div className="text-4xl font-bold text-[#1B4D3E]">
                    {activeTicket.estimatedWait}
                  </div>
                  <p className="text-sm text-[#1B4D3E]/60 font-medium mt-1">
                    Service around {activeTicket.serviceAround}
                  </p>
                </div>

                {}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">
                      Priority Status
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full font-semibold text-xs ${
                        activeTicket.priority === "Yes"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {activeTicket.priority === "Yes" ? "Yes" : "No"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">
                      Joined Queue
                    </span>
                    <span className="font-semibold text-[#1B4D3E]">
                      {activeTicket.joined}
                    </span>
                  </div>
                </div>
              </CardContent>

              {}
              <CardFooter className="p-6 pt-0 pb-10">
                <Button
                  onClick={handleLeaveQueue}
                  className="w-full h-14 text-lg font-bold text-[#1B4D3E] bg-[#F4E08F] hover:bg-[#EACF6A] rounded-xl shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                >
                  Leave Queue
                </Button>
              </CardFooter>
            </Card>

            {}
            <div className="mt-4 bg-[#6A9A8B] text-white p-4 rounded-xl text-sm shadow-sm flex items-start gap-3">
              {}
              <svg
                className="w-5 h-5 shrink-0 opacity-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p>
                  <span className="font-bold">Queue Updates:</span> You've been
                  added to the end of the queue.
                </p>
                <p className="text-white/70 text-xs mt-1">Just now</p>
              </div>
            </div>
          </>
        ) : (
          <Card className="bg-white border-none shadow-lg overflow-hidden rounded-2xl text-center p-8 space-y-6">
            <CardContent className="p-0 space-y-4">
              <div className="h-24 w-24 bg-[#E8F3E8] rounded-full flex items-center justify-center mx-auto">
                <UsersIcon className="h-12 w-12 text-[#1B4D3E]" />
              </div>
              <h2 className="text-2xl font-bold text-[#1B4D3E]">
                Not in a Queue yet?
              </h2>
              <p className="text-gray-500">
                Get a ticket number to start queuing for a service.
              </p>
            </CardContent>
            <CardFooter className="p-0 pt-4">
              <Button
                onClick={handleGetNumber}
                className="w-full py-6 text-lg font-bold text-white bg-[#1B4D3E] hover:bg-[#153a2f] rounded-xl shadow-sm"
              >
                Get a Number
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  );
}
