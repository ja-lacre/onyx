/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users as UsersIcon, Check, SkipForward, Zap, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getActiveQueue, updateTicketStatus, callNextInLine, getQueueConfig } from "@/utils/queue-service";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { cn } from "@/lib/utils"; 


export default function QueueManagementPage() {
    const supabase = useMemo(() => createClient(), []);
        const [queueConfig, setQueueConfig] = useState<any>(null);
        const [queue, setQueue] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);
        const [actionLoading, setActionLoading] = useState(false);
        const [servingTicket, setServingTicket] = useState<any>(null);
        const [searchTerm, setSearchTerm] = useState('');

        // --- FUNCTION TO FETCH AND UPDATE THE QUEUE DATA ---
        const fetchQueue = useCallback(async (queueId: string) => { 
            setLoading(true);
            try {
                const data = await getActiveQueue(supabase, queueId); 
                setQueue(data);
                const serving = data.find(t => t.status === 'serving');
                setServingTicket(serving || null);
            } catch (error) {
                console.error("Error fetching queue:", error);
            } finally {
                setLoading(false);
            }
        }, [supabase]);

        // --- INITIAL LOAD EFFECT (Runs only once on mount) ---
        useEffect(() => {
            const initAdminData = async () => {
                // 1. Fetch Global Settings (Primary Service Name)
                const currentQueueConfig = await getQueueConfig(supabase);
                setQueueConfig(currentQueueConfig); 

                if (currentQueueConfig && currentQueueConfig.id) {
                    await fetchQueue(currentQueueConfig.id);
                } else {
                    console.warn("Queue configuration is missing. Please ensure a row exists in the 'queues' table.");
                }
            };

            initAdminData();
            
        }, [supabase, fetchQueue]);

        // --- REALTIME LISTENER EFFECT (Runs when settings are available) ---
        useEffect(() => {
            if (!queueConfig) return; // Wait for settings to load

            const ticketsChannel = supabase
                .channel('admin_queue_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {

                fetchQueue(queueConfig.id); 
                })
                .subscribe();

        
           const settingsChannel = supabase
            .channel('global_settings_sync') 
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'queues' 
            }, (payload: any) => {
                setQueueConfig(payload.new); 
            })
            .subscribe();

            return () => {

                supabase.removeChannel(ticketsChannel);
                supabase.removeChannel(settingsChannel);
            };

        }, [supabase, fetchQueue, queueConfig]);


        // --- FUNCTIONAL HANDLERS ---

        // 1. Call Next / Start Service
        const handleCallNext = async () => {
            if (!queueConfig || !queueConfig.id) {
                alert("System Configuration Error: Please ensure the Queue Service is configured in the Settings tab.");
                console.error("Attempted to call next ticket before queueConfig.id was loaded or configured.");
                return; 
            }

            setActionLoading(true);
            try {

                await callNextInLine(supabase, queueConfig.id);
                await fetchQueue(queueConfig.id); 

            } catch (error) {
                console.error("Error calling next ticket:", error);
                alert("Failed to call next ticket. Check console for details.");
            } finally {
                setActionLoading(false);
            }
        };

        // 2. Complete Service (Completes the currently serving ticket)
        const handleCompleteService = async () => {
            if (!servingTicket || !queueConfig) return alert("No one is currently being served or config is missing.");
            setActionLoading(true);

            try {
                // Step 1: Mark the current ticket as completed
                await updateTicketStatus(supabase, servingTicket.ticket_id || servingTicket.id, 'completed');
                
                // --- STEP 2: CHECK AUTO-ADVANCE FLAG ---
                if (queueConfig.auto_advance) {
                    await callNextInLine(supabase, queueConfig.id);
                } else {
                    setServingTicket(null); 
                }

                // Step 3: Refresh the queue to show changes
                await fetchQueue(queueConfig.id); 

            } catch (error) {
                console.error("Error completing service:", error);
                alert("Failed to complete service.");
            } finally {
                setActionLoading(false);
            }
        };

        // 3. Skip/Cancel Current Ticket (FIXED LOGIC)
        const handleSkipTicket = async () => {
            if (!servingTicket || !queueConfig) return alert("No one is currently being served or config is missing.");
            setActionLoading(true);
            
            const ticketId = servingTicket.ticket_id || servingTicket.id;

            try {
                // --- STEP 1: CHECK AUTO-ROLLBACK FLAG ---
                if (queueConfig.auto_rollback) {
                    // FIX: Set priority to FALSE and explicitly request requeueBack=true.
                    await updateTicketStatus(
                        supabase, 
                        ticketId, 
                        'waiting', 
                        false, // <--- EXPLICITLY SET PRIORITY TO FALSE
                        true // <--- NEW: requeueBack=true to reset created_at
                    ); 
                    alert(`Ticket ${servingTicket.ticket_number} rolled back to the end of the queue.`);
                } else {
                    // Standard Skip: Mark as cancelled/removed
                    await updateTicketStatus(supabase, ticketId, 'cancelled');
                    alert(`Ticket ${servingTicket.ticket_number} cancelled.`);
                }
                
                // --- STEP 2: ADVANCE THE QUEUE ---
                await callNextInLine(supabase, queueConfig.id, true);

                // Step 3: Refresh the queue
                await fetchQueue(queueConfig.id); 

            } catch (error) {
                console.error("Error skipping ticket:", error);
                alert("Failed to skip ticket.");
            } finally {
                setActionLoading(false);
            }
        };
    
        const handleTogglePriority = async (ticket: any) => {
            const ticketId = ticket.ticket_id || ticket.id;
            const currentStatus = ticket.status; // e.g., 'waiting'
            
            // Determine the NEW priority state: Toggle the current one
            const newPriorityState = !ticket.is_priority; 

            setActionLoading(true);
            try {
                await updateTicketStatus(
                    supabase, 
                    ticketId, 
                    currentStatus, 
                    newPriorityState // Pass the toggled boolean
                    // NOTE: requeueBack is undefined, so created_at is preserved.
                );

                // Refresh the queue to show the updated status
                await fetchQueue(queueConfig.id); 
            } catch (error) {
                console.error("Error toggling priority:", error);
                alert("Failed to update ticket priority.");
            } finally {
                setActionLoading(false);
            }
        };
        
        // --- FILTERED QUEUE CALCULATION ---
        const filteredQueue = useMemo(() => {
            if (!searchTerm) {
                return queue;
            }
            const lowerCaseSearch = searchTerm.toLowerCase();
            
            // Filter by ticket number
            return queue.filter(ticket => 
                String(ticket.ticket_number).includes(lowerCaseSearch)
            );
        }, [queue, searchTerm]);


        // --- DISPLAY CALCULATION ---
        const nextInQueue = queue.find(t => t.status === 'waiting')?.ticket_number || '—';
        const totalWaiting = queue.filter(t => t.status === 'waiting').length;
        
        // --- RENDER BLOCKING ---
        if (loading || !queueConfig) { 
            return <div className="h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#1B4D3E]" /></div>;
        }

        return (
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-bold text-[#1B4D3E]">
                        Queue Management ({queueConfig.name})
                    </h1>
                    <p className="text-gray-500">
                        Monitor and manage customer queues in real-time
                    </p>
                </div>

                {/* Queue Controls */}
                <Card className="p-4">
                    <div className="flex items-center space-x-4">
                        <span className="font-medium">Queue Controls</span>
                        
                            <Button 
                                onClick={handleCallNext} 
                                disabled={actionLoading || totalWaiting === 0 || servingTicket} 
                                className="bg-[#1B4D3E] hover:bg-[#153a2f]"
                            >
                                {actionLoading && !servingTicket ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                                Call Next 
                            </Button>
                        
                        <Button onClick={handleCompleteService} disabled={actionLoading || !servingTicket} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                            {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Complete Service
                        </Button>
                        
                        <Button onClick={handleSkipTicket} disabled={actionLoading || !servingTicket} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                            <SkipForward className="mr-2 h-4 w-4" /> Skip
                        </Button>
                    </div>
                </Card>

                {/* Queue Status Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Currently Serving</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-bold text-[#1B4D3E] text-center">
                                {servingTicket?.ticket_number || '—'}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Next in Queue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-bold text-[#1B4D3E] text-center">
                                {nextInQueue}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Waiting</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-bold text-[#1B4D3E] text-center">
                                {totalWaiting}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search Bar */}
                <div className="space-y-2">
                    <Label htmlFor="ticket-search">Search Queue</Label>
                    <Input
                        id="ticket-search"
                        placeholder="Filter by Ticket Number (e.g., 105)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[#E8F3E8] text-[#1B4D3E]" 
                    />
                </div>

                {/* Current Queue Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Current Queue ({filteredQueue.length} shown)</CardTitle> 
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ticket #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredQueue.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-4 text-gray-500">
                                        {searchTerm ? "No matching tickets found." : "Queue is empty!"}
                                    </TableCell></TableRow>
                                ) : (
                                    filteredQueue.map((item) => (
                                        <TableRow 
                                            key={item.ticket_id || item.id}
                                            className={cn(
                                                item.status === 'serving' ? 'bg-yellow-50 hover:bg-yellow-100' : '',
                                                item.status === 'waiting' && item.is_priority ? 'bg-red-50/70 hover:bg-red-100/70 border-1 border-red-500' : ''
                                            )}
                                        >
                                            <TableCell className="font-medium">{item.ticket_number}</TableCell>
                                            <TableCell>
                                                {item.user_id?.preferred_name || item.user_id?.first_name || 'Anonymous'}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </TableCell>
                                            <TableCell>
                                                {item.is_priority ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                                        No
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    item.status === "serving" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                            {item.status === 'waiting' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleTogglePriority(item)}
                                                    disabled={actionLoading}
                                                    title={item.is_priority ? "Remove Priority" : "Elevate to Priority"}
                                                >
                                                    {item.is_priority ? (
                                                        <RefreshCw className="h-4 w-4 text-gray-500" />
                                                    ) : (
                                                        <Zap className="h-4 w-4 text-red-500" />
                                                    )}
                                                </Button>
                                            )}
                                        </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    }