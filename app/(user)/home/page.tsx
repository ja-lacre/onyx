// src/app/(user)/home/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Users as UsersIcon, Clock as ClockIcon, Loader2 } from "lucide-react";
import { UserTopbar } from "@/components/user/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { getQueueMetrics, joinQueue, leaveQueue, formatTime, getQueueConfig, } from "@/utils/queue-service";

export default function UserDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [queueConfig, setQueueConfig] = useState<any>(null); 
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(false); // For button actions
  const [isChecking, setIsChecking] = useState(true); // For initial page load
  

  // --- REFACTORED: METRICS CALCULATOR ---
  const refreshQueueData = useCallback(async (ticket: any) => {
    if (!ticket) return;

    // Use the helper function instead of raw Supabase queries
    const serviceIdentifier = ticket.queue_id;
    const ticketId = ticket.ticket_id || ticket.id;

    const metrics = await getQueueMetrics(
        supabase, 
        serviceIdentifier, 
        ticket.created_at,
        ticketId, // ADDED: Pass the ticket ID
        ticket.status // ADDED: Pass the ticket status
    );

    setActiveTicket((prev: any) => ({
      ...prev,
      ...ticket,
      id: ticket.ticket_id || ticket.id,
      number: ticket.ticket_number,
      currentPosition: metrics.position,
      totalInLine: metrics.totalInLine,
      estimatedWait: metrics.estimatedWait,
      serviceAround: metrics.serviceAround,
      priority: ticket.is_priority ? "Yes" : "No",
      joined: formatTime(ticket.created_at),
    }));
  }, [supabase]);

  // --- REFACTORED: JOIN QUEUE ---
  const handleGetNumber = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Check 1: User & Global Settings Loaded
      if (!user || !queueConfig) { 
          alert("System data is initializing. Please wait a moment.");
          setLoading(false);
          return;
      }

      // CHECK 2: Is the Service Name configured? 
      if (!queueConfig.id|| !queueConfig.name) {
          alert("The queue service name has not been configured by an administrator yet.");
          setLoading(false);
          return;
      }

      try {
          // Pass the dynamic Company Name as the service name
          const newTicket = await joinQueue(supabase, user.id, queueConfig.id);
          await refreshQueueData(newTicket);
      } catch (error: any) {
          console.error('Error joining:', error);
          alert(error.message || 'Could not join queue.');
      } finally {
          setLoading(false);
      }
  };

  // --- REFACTORED: LEAVE QUEUE ---
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

  // --- EXISTING TICKET CHECK ---
  useEffect(() => {
    let isMounted = true;

    const checkExistingTicket = async () => {
      setIsChecking(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const currentQueueConfig = await getQueueConfig(supabase);
      if (isMounted) setQueueConfig(currentQueueConfig);

      if (!user) {
        if (isMounted) setIsChecking(false);
        return;
      }

      // A. Get User Name
      const { data: profile } = await supabase
        .from('users')
        .select('first_name, preferred_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (isMounted && profile) {
        setUserProfile(profile);
      } else if (isMounted) {
         setUserProfile(null); 
      }

      // B. CRITICAL: Check for Active Ticket
      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['waiting', 'serving'])
        .maybeSingle(); 

      if (isMounted) {
        if (existingTicket) {
          await refreshQueueData(existingTicket);
        }
        setIsChecking(false);
      }
    };

    checkExistingTicket();
    return () => { isMounted = false; };
  }, [supabase, refreshQueueData]);

  const displayName = userProfile?.preferred_name || userProfile?.first_name || "User";

  // --- SKELETON LOADING VIEW (Prevents Flashing) ---
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#E8F3E8] p-4 md:p-8">
        <UserTopbar />
        <main className="max-w-md mx-auto space-y-6 mt-6 animate-pulse">
          {/* Skeleton for "Hello, User" */}
          <div className="h-7 w-32 bg-gray-300 rounded-md opacity-50"></div>
          {/* Skeleton Card */}
          <Card className="bg-white border-none shadow-lg overflow-hidden rounded-2xl text-center p-8 space-y-6">
            <CardContent className="p-0 space-y-4 flex flex-col items-center">
              <div className="h-24 w-52 bg-[#E8F3E8] rounded-md opacity-50"></div>
              <div className="h-8 w-48 bg-gray-200 rounded-md"></div>
              <div className="h-4 w-64 bg-gray-100 rounded-md"></div>
            </CardContent>
            <CardFooter className="p-0 pt-4 w-full">
              <div className="w-full h-16 bg-[#1B4D3E]/20 rounded-xl"></div>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8F3E8] p-4 md:p-8">
      <UserTopbar />

      <main className="max-w-md mx-auto space-y-6">
        <p className="text-lg text-[#1B4D3E] font-medium">Hello, {displayName}</p>

        {queueConfig && activeTicket && (
          <p className="text-sm text-gray-600 font-medium text-center">
            You are currently queuing for: 
            <span className="text-[#1B4D3E] font-bold"> {queueConfig.name}</span>
          </p>
      )}

        {activeTicket ? (
          // --- VIEW 1: ACTIVE TICKET ---
          <>
            <Card className="max-w-md w-full bg-white border-none shadow-lg overflow-hidden rounded-2xl ring-1 ring-black/5 p-0">
              {/* Green Header */}
              <div className="bg-[#1B4D3E] py-10 px-6 text-center">
                <h2 className="text-white/80 text-lg font-medium mb-1 tracking-wide">
                  Your Ticket Number
                </h2>
                <div className="text-7xl font-bold text-white tracking-tight">
                  {activeTicket.number}
                </div>
              </div>

              {/* White Body */}
              <CardContent className="p-6 space-y-6">
                
                {/* Current Position */}
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

                {/* Estimated Wait */}
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

                {/* Details */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Priority Status</span>
                    <span className={`px-3 py-1 rounded-full font-semibold text-xs ${
                        activeTicket.priority === "Yes"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}>
                      {activeTicket.priority}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Joined Queue</span>
                    <span className="font-semibold text-[#1B4D3E]">
                      {activeTicket.joined}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0 pb-10">
                <Button
                    onClick={handleLeaveQueue}
                    disabled={loading}
                    variant="accent-gold"
                    className="w-full h-14 text-lg font-bold" 
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Leaving...</>
                  ) : "Leave Queue"}
                </Button>
              </CardFooter>
            </Card>
          </>
        ) : (
          // --- VIEW 2: NO TICKET ---
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
                disabled={loading}
                className="w-full py-6 text-lg font-bold text-white bg-[#1B4D3E] hover:bg-[#153a2f] rounded-xl shadow-sm"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Joining...</>
                ) : "Get a Number"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  );
}