    "use client";

    import { useMemo, useState, useEffect, useCallback } from "react";
    import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
    import { Loader2, Zap, Users as UsersIcon, Check, SkipForward } from "lucide-react"; // Note: Removed unused icons
    import { Button } from "@/components/ui/button";
    import { createClient } from "@/lib/supabase/client";
    import { getActiveQueue, updateTicketStatus, callNextInLine, getQueueConfig } from "@/utils/queue-service";


    export default function QueueManagementPage() {
        const supabase = useMemo(() => createClient(), []);

        const [queueConfig, setQueueConfig] = useState<any>(null);
        const [queue, setQueue] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);
        const [actionLoading, setActionLoading] = useState(false);
        const [servingTicket, setServingTicket] = useState<any>(null);

        // --- FUNCTION TO FETCH AND UPDATE THE QUEUE DATA ---
        // FIX: serviceName is now an explicit parameter in the callback signature
        const fetchQueue = useCallback(async (queueId: string) => { 
            setLoading(true);
            try {
                // FIX: Use the parameter here instead of relying on outer scope
                const data = await getActiveQueue(supabase, queueId); 
                setQueue(data);
                const serving = data.find(t => t.status === 'serving');
                setServingTicket(serving || null);
            } catch (error) {
                console.error("Error fetching queue:", error);
            } finally {
                setLoading(false);
            }
        }, [supabase]); // Dependencies are clean

        // --- INITIAL LOAD EFFECT (Runs only once on mount) ---
        useEffect(() => {
            const initAdminData = async () => {
                // 1. Fetch Global Settings (Primary Service Name)
                const currentQueueConfig = await getQueueConfig(supabase);
                setQueueConfig(currentQueueConfig); // This updates the settings state

                // 2. PASS THE NAME: Fetch the initial queue data immediately
                await fetchQueue(currentQueueConfig.id); 
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

        }, [supabase, fetchQueue, queueConfig]); // Depends on settings


        // --- FUNCTIONAL HANDLERS ---

        // 1. Call Next / Start Service
        const handleCallNext = async () => {
            if (!queueConfig) return;
            setActionLoading(true);
            try {
                const currentId = servingTicket?.ticket_id || servingTicket?.id || null;

                await callNextInLine(supabase, currentId, queueConfig.id);

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
            if (!servingTicket) return alert("No one is currently being served.");
            setActionLoading(true);
            try {
                await updateTicketStatus(supabase, servingTicket.ticket_id || servingTicket.id, 'completed');
                // Refresh using the current settings name
                await fetchQueue(queueConfig.id); 
            } catch (error) {
                console.error("Error completing service:", error);
                alert("Failed to complete service.");
            } finally {
                setActionLoading(false);
            }
        };

        // 3. Skip/Cancel Current Ticket
        const handleSkipTicket = async () => {
            if (!servingTicket) return alert("No one is currently being served to skip.");
            setActionLoading(true);
            try {
                await updateTicketStatus(supabase, servingTicket.ticket_id || servingTicket.id, 'cancelled');
                
                // Move the queue forward automatically after skipping
                await handleCallNext();

            } catch (error) {
                console.error("Error skipping ticket:", error);
                alert("Failed to skip ticket.");
            } finally {
                setActionLoading(false);
            }
        };
        
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
                        
                        <Button onClick={handleCallNext} disabled={actionLoading || totalWaiting === 0} className="bg-[#1B4D3E] hover:bg-[#153a2f]">
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

                {/* Current Queue Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Current Queue</CardTitle>
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {queue.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-4 text-gray-500">Queue is empty!</TableCell></TableRow>
                                ) : (
                                    queue.map((item) => (
                                        <TableRow 
                                            key={item.ticket_id || item.id}
                                            className={item.status === 'serving' ? 'bg-yellow-50 hover:bg-yellow-100' : ''}
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
                                                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">Yes</span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">No</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    item.status === "serving" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                                                }`}>
                                                    {item.status}
                                                </span>
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