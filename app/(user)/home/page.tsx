// src/app/(user)/home/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Users as UsersIcon, Clock as ClockIcon, Loader2, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { getQueueMetrics, joinQueue, leaveQueue, formatTime, getQueues } from "@/utils/queue-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function UserDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  
  const [queues, setQueues] = useState<any[]>([]); 
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');

  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(false); 
  const [isChecking, setIsChecking] = useState(true); 
  
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false); 

  // ✨ NEW: State to hold our dynamic time-based greeting
  const [greeting, setGreeting] = useState("Hello");

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
        setIsQueueModalOpen(false);
        setIsClosing(false);
    }, 300);
  };

  const refreshQueueData = useCallback(async (ticket: any) => {
    if (!ticket) return;

    const serviceIdentifier = ticket.queue_id;
    const ticketId = ticket.ticket_id || ticket.id;

    const metrics = await getQueueMetrics(
        supabase, 
        serviceIdentifier, 
        ticket.created_at,
        ticketId, 
        ticket.status 
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

  const fetchInitialData = useCallback(async (silent = false) => {
      if (!silent) setIsChecking(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const allQueues = await getQueues(supabase);
      setQueues(allQueues);
      if (allQueues.length > 0) {
          setSelectedQueueId(prev => prev || allQueues[0].id);
      }

      if (!user) {
        if (!silent) setIsChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('first_name, preferred_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) setUserProfile(profile);

      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['waiting', 'serving'])
        .maybeSingle(); 

      if (existingTicket) {
        await refreshQueueData(existingTicket);
      } else {
        setActiveTicket(null);
      }
      if (!silent) setIsChecking(false);
  }, [supabase, refreshQueueData]);

  useEffect(() => {
      fetchInitialData();
  }, [fetchInitialData]);

  // ✨ NEW: Check the device's clock and set the greeting
  useEffect(() => {
      const currentHour = new Date().getHours();
      if (currentHour < 12) {
          setGreeting("Good Morning");
      } else if (currentHour < 18) {
          setGreeting("Good Afternoon");
      } else {
          setGreeting("Good Evening");
      }
  }, []);

  useEffect(() => {
      const channel = supabase.channel('user_dashboard_updates')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
              fetchInitialData(true); 
          })
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchInitialData]);

  const handleGetNumber = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) { 
          toast.error("System data is initializing. Please wait a moment.");
          setLoading(false);
          return;
      }

      if (!selectedQueueId) {
          toast.error("Please select a queue service first.");
          setLoading(false);
          return;
      }

      try {
          const newTicket = await joinQueue(supabase, user.id, selectedQueueId);
          await refreshQueueData(newTicket);
          handleCloseModal(); 
          toast.success("Successfully joined the queue!");
      } catch (error: any) {
          console.error('Error joining:', error);
          toast.error(error.message || 'Could not join queue.');
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
      toast.success("You have left the queue.");
    } catch (error) {
      console.error("Error leaving queue:", error);
      toast.error("Failed to leave the queue.");
    } finally {
      setLoading(false);
    }
  };

  const displayName = userProfile?.preferred_name || userProfile?.first_name || "User";
  
  const activeQueueName = useMemo(() => {
      return queues.find(q => q.id === activeTicket?.queue_id)?.name || "the queue";
  }, [queues, activeTicket]);

  if (isChecking) {
    return (
        <main className="max-w-md mx-auto space-y-6 mt-2 animate-pulse">
          <div className="h-8 w-64 bg-gray-300 rounded-md opacity-50"></div>
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
    );
  }

  return (
    <>
      <main className="max-w-md mx-auto space-y-6 relative mt-2">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 mb-4">
            {/* ✨ UPDATED: Dynamic greeting with bigger, bolder styling! */}
            <h1 className="text-3xl font-bold text-[#1B4D3E] tracking-tight">
                {greeting}, {displayName}!
            </h1>

            {activeTicket && (
            <p className="text-sm text-gray-600 font-medium mt-1">
                You are currently queuing for: 
                <span className="text-[#1B4D3E] font-bold"> {activeQueueName}</span>
            </p>
            )}
        </div>

        {activeTicket ? (
          <>
            <Card className="max-w-md w-full bg-white border-none shadow-lg overflow-hidden rounded-2xl ring-1 ring-black/5 p-0 animate-in zoom-in-95 duration-500 ease-out">
              <div className="bg-[#1B4D3E] py-10 px-6 text-center">
                <h2 className="text-white/80 text-lg font-medium mb-1 tracking-wide">
                  Your Ticket Number
                </h2>
                
                <div className={cn(
                    "text-7xl font-bold tracking-tight flex items-center justify-center gap-3 transition-colors duration-500",
                    activeTicket.priority === "Yes" ? "text-yellow-400" : "text-white"
                )}>
                  {activeTicket.priority === "Yes" && <Star className="h-12 w-12 fill-current" />}
                  {activeTicket.priority === "Yes" ? `P-${activeTicket.number}` : activeTicket.number}
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                <div className="bg-[#E8F5E9] rounded-xl p-6 flex flex-col items-center justify-center text-center border border-[#1B4D3E]/10">
                  <p className="text-[#1B4D3E] font-semibold flex items-center gap-2 mb-1">
                    <UsersIcon className="h-5 w-5" /> Current Position
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
                    <ClockIcon className="h-5 w-5" /> Estimated Time Wait
                  </p>
                  <div className="text-4xl font-bold text-[#1B4D3E]">
                    {activeTicket.estimatedWait}
                  </div>
                  <p className="text-sm text-[#1B4D3E]/60 font-medium mt-1">
                    Service around {activeTicket.serviceAround}
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Priority Status</span>
                    <span className={`px-3 py-1 rounded-full font-semibold text-xs transition-colors duration-300 ${
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
                    variant="outline"
                    className="cursor-pointer w-full h-14 text-lg font-bold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors" 
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Leaving...</>
                  ) : "Leave Queue"}
                </Button>
              </CardFooter>
            </Card>
          </>
        ) : (
          <Card className="bg-white border-none shadow-lg overflow-hidden rounded-2xl text-center p-8 space-y-6 animate-in zoom-in-95 duration-500 ease-out">
            <CardContent className="p-0 space-y-6">
              <div className="h-24 w-24 bg-[#E8F3E8] rounded-full flex items-center justify-center mx-auto">
                <UsersIcon className="h-12 w-12 text-[#1B4D3E]" />
              </div>
              <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-[#1B4D3E]">Not in a Queue yet?</h2>
                  <p className="text-gray-500">Click the button below to select a service and get your ticket number.</p>
              </div>
            </CardContent>
            
            <CardFooter className="p-0 pt-2">
              <Button
                onClick={() => setIsQueueModalOpen(true)}
                disabled={loading || queues.length === 0}
                className="cursor-pointer w-full py-6 text-lg font-bold text-white bg-[#1B4D3E] hover:bg-[#153a2f] rounded-xl shadow-sm disabled:opacity-50 transition-colors"
              >
                Get a Number
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>

      {/* --- QUEUE SELECTION MODAL POPUP --- */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          <div 
             className={cn(
               "cursor-pointer absolute inset-0 bg-black/60 backdrop-blur-sm duration-300",
               isClosing ? "animate-out fade-out" : "animate-in fade-in"
             )}
             onClick={() => !loading && handleCloseModal()} 
          />
          
          <div className={cn(
              "bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 duration-300 ease-out",
              isClosing ? "animate-out fade-out slide-out-to-bottom-8 zoom-out-95" : "animate-in fade-in slide-in-from-bottom-8 zoom-in-95"
          )}>
            
            <div className="p-6 text-center border-b border-gray-100">
              <h3 className="text-2xl font-bold text-[#1B4D3E]">Select Service</h3>
              <p className="text-sm text-gray-500 mt-1">Choose which queue you want to join</p>
            </div>
            
            <div className="p-6 bg-gray-50/50 flex-1 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 gap-3">
                {queues.map(q => (
                    <button
                        key={q.id}
                        onClick={() => setSelectedQueueId(q.id)}
                        className={`cursor-pointer flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                            selectedQueueId === q.id 
                            ? 'border-[#1B4D3E] bg-[#E8F3E8] text-[#1B4D3E] shadow-sm' 
                            : 'border-gray-200 bg-white shadow-sm text-gray-600 hover:border-[#1B4D3E]/40 hover:bg-gray-50'
                        }`}
                    >
                        <span className="font-bold text-lg">{q.name}</span>
                        {selectedQueueId === q.id && <CheckCircle2 className="h-6 w-6 text-[#1B4D3E]" />}
                    </button>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 bg-white">
              <Button 
                  onClick={handleCloseModal} 
                  variant="outline" 
                  className="cursor-pointer flex-1 py-6 text-lg font-bold rounded-xl border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                  disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                  onClick={handleGetNumber} 
                  disabled={loading || !selectedQueueId} 
                  className="cursor-pointer flex-1 py-6 text-lg font-bold bg-[#1B4D3E] hover:bg-[#153a2f] text-white rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                 {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}