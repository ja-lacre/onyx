// src/app/(admin)/queue-management/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, SkipForward, Zap, RefreshCw, Loader2, Plus, RotateCcw, Trash2, ChevronDown, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getActiveQueue, updateTicketStatus, callNextInLine, addQueue, resetQueue, deleteQueue, updateQueueConfig } from "@/utils/queue-service";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { cn } from "@/lib/utils"; 
import { toast } from "sonner"; 

export default function QueueManagementPage() {
    const supabase = useMemo(() => createClient(), []);
        
    const [queues, setQueues] = useState<any[]>([]);
    const [selectedQueueId, setSelectedQueueId] = useState<string>('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [servingTicket, setServingTicket] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    // ✨ NEW: Track which specific modal is currently animating out
    const [closingModal, setClosingModal] = useState<string | null>(null);

    const [editQueueData, setEditQueueData] = useState<any>(null);
    const [newQueueData, setNewQueueData] = useState({ name: '', max_capacity: 50, avg_service_time: 5 });

    const activeQueueConfig = useMemo(() => {
        return queues.find(q => q.id === selectedQueueId) || null;
    }, [queues, selectedQueueId]);

    // ✨ NEW: Unified exit animation function for all 4 admin modals
    const closeModal = (modalName: string, setModalState: (v: boolean) => void) => {
        setClosingModal(modalName);
        setTimeout(() => {
            setModalState(false);
            setClosingModal(null);
        }, 300);
    };

    const fetchQueue = useCallback(async (queueId: string) => { 
        setLoading(true);
        try {
            const data = await getActiveQueue(supabase, queueId); 
            setQueue(data || []);
            const serving = (data || []).find((t: any) => t.status === 'serving');
            setServingTicket(serving || null);
        } catch (error: any) {
            console.error("Error fetching queue:", error.message || error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        const initAdminData = async () => {
            const { data: allQueues, error } = await supabase.from('queues').select('*').order('name');
            if (error) console.error("Error fetching queues:", error);

            if (allQueues && allQueues.length > 0) {
                setQueues(allQueues);
                setSelectedQueueId(allQueues[0].id);
            } else {
                setLoading(false);
            }
        };
        initAdminData();
    }, [supabase]);

    useEffect(() => {
        if (selectedQueueId) fetchQueue(selectedQueueId);
    }, [selectedQueueId, fetchQueue]);

    useEffect(() => {
        if (!selectedQueueId) return; 
        const ticketsChannel = supabase.channel(`admin-queue-${selectedQueueId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
                fetchQueue(selectedQueueId);
            }).subscribe();
        return () => { supabase.removeChannel(ticketsChannel); };
    }, [supabase, fetchQueue, selectedQueueId]);

    const handleAddQueue = async () => {
        setActionLoading(true);
        try {
            const newQueue = await addQueue(supabase, newQueueData);
            setQueues(prev => {
                const updated = [...prev, newQueue];
                return updated.sort((a, b) => a.name.localeCompare(b.name));
            });
            setSelectedQueueId(newQueue.id);
            closeModal('add', setIsAddModalOpen);
            setNewQueueData({ name: '', max_capacity: 50, avg_service_time: 5 });
            toast.success(`${newQueueData.name} has been successfully added!`);
        } catch (error: any) {
            console.error("Error adding queue:", error);
            toast.error("Failed to add new service.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditQueue = async () => {
        if (!editQueueData || !editQueueData.id) return;
        setActionLoading(true);
        try {
            await updateQueueConfig(supabase, editQueueData);
            setQueues(prev => prev.map(q => q.id === editQueueData.id ? { ...q, ...editQueueData } : q));
            closeModal('edit', setIsEditModalOpen);
            toast.success("Service updated successfully!");
        } catch (error) {
            console.error("Error editing queue:", error);
            toast.error("Failed to update service details.");
        } finally {
            setActionLoading(false);
        }
    };
    
    const openEditModal = () => {
        if (activeQueueConfig) {
            setEditQueueData({ ...activeQueueConfig });
            setIsEditModalOpen(true);
        }
    };

    const handleDeleteQueue = async () => {
        if (!selectedQueueId) return;
        setActionLoading(true);
        try {
            await deleteQueue(supabase, selectedQueueId);
            closeModal('delete', setIsDeleteModalOpen);
            toast.success("Service removed successfully.");
            
            const remainingQueues = queues.filter(q => q.id !== selectedQueueId);
            setQueues(remainingQueues);
            if (remainingQueues.length > 0) setSelectedQueueId(remainingQueues[0].id);
            else { setSelectedQueueId(''); setQueue([]); }
        } catch (error) {
            console.error("Error removing queue:", error);
            toast.error("Failed to remove service.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetQueue = async (hardReset: boolean) => {
        setActionLoading(true);
        try {
            await resetQueue(supabase, selectedQueueId, hardReset);
            closeModal('reset', setIsResetModalOpen);
            await fetchQueue(selectedQueueId);
            toast.success(hardReset ? "Midnight Reset successful!" : "Queue cleared successfully!");
        } catch (error: any) {
            console.error("Error resetting queue:", error);
            toast.error("Failed to reset the queue. Did you run the SQL script?");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCallNext = async () => {
        if (!activeQueueConfig) return; 
        setActionLoading(true);
        try {
            await callNextInLine(supabase, activeQueueConfig.id);
        } catch (error) {
            toast.error("Failed to call next ticket.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCompleteService = async () => {
        if (!servingTicket || !activeQueueConfig) return;
        setActionLoading(true);
        try {
            await updateTicketStatus(supabase, servingTicket.ticket_id || servingTicket.id, 'completed');
            if (activeQueueConfig.auto_advance) await callNextInLine(supabase, activeQueueConfig.id);
            else setServingTicket(null); 
        } catch (error) {
            toast.error("Failed to complete service.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSkipTicket = async () => {
        if (!servingTicket || !activeQueueConfig) return;
        setActionLoading(true);
        const ticketId = servingTicket.ticket_id || servingTicket.id;
        try {
            if (activeQueueConfig.auto_rollback) {
                await updateTicketStatus(supabase, ticketId, 'waiting', false, true); 
                toast.success(`Ticket rolled back to the end of the queue.`);
            } else {
                await updateTicketStatus(supabase, ticketId, 'cancelled');
                toast.success(`Ticket cancelled.`);
            }
            await callNextInLine(supabase, activeQueueConfig.id, true);
        } catch (error) {
            toast.error("Failed to skip ticket.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleTogglePriority = async (ticket: any) => {
        const ticketId = ticket.ticket_id || ticket.id;
        setActionLoading(true);
        try {
            await updateTicketStatus(supabase, ticketId, ticket.status, !ticket.is_priority);
        } catch (error) {
            toast.error("Failed to update ticket priority.");
        } finally {
            setActionLoading(false);
        }
    };
    
    const filteredQueue = useMemo(() => {
        if (!searchTerm) return queue;
        return queue.filter(ticket => String(ticket.ticket_number).includes(searchTerm.toLowerCase()));
    }, [queue, searchTerm]);

    const nextInQueue = queue.find(t => t.status === 'waiting')?.ticket_number || '—';
    const totalWaiting = queue.filter(t => t.status === 'waiting').length;
    
    if (loading) { 
        return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#1B4D3E]" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#1B4D3E]">Queue Management</h1>
                    <p className="text-gray-500">Monitor and manage customer queues in real-time</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto z-40">
                    <div className="relative w-full md:w-56 flex-grow">
                        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 rounded-xl border border-gray-200 bg-white text-[#1B4D3E] font-bold shadow-sm outline-none transition-all cursor-pointer flex justify-between items-center hover:border-[#1B4D3E]/50">
                            <span className="truncate pr-2">{activeQueueConfig ? activeQueueConfig.name : (queues.length === 0 ? "No Services" : "Select Service")}</span>
                            <ChevronDown className={cn("h-5 w-5 transition-transform text-[#1B4D3E]", isDropdownOpen ? "rotate-180" : "")} />
                        </button>
                        {isDropdownOpen && (
                            <>
                                <div className="fixed inset-0 cursor-default" onClick={() => setIsDropdownOpen(false)}></div>
                                <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="max-h-60 overflow-y-auto py-1">
                                        {queues.length === 0 ? (
                                            <div className="p-3 text-sm text-gray-500 text-center">No services found</div>
                                        ) : (
                                            queues.map(q => (
                                                <button key={q.id} onClick={() => { setSelectedQueueId(q.id); setIsDropdownOpen(false); }} className={cn("w-full text-left px-4 py-3 font-bold transition-colors cursor-pointer text-sm", selectedQueueId === q.id ? "bg-[#E8F3E8] text-[#1B4D3E]" : "text-gray-600 hover:bg-gray-50 hover:text-[#1B4D3E]")}>
                                                    {q.name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <Button variant="outline" onClick={() => setIsAddModalOpen(true)} className="cursor-pointer p-3 h-auto bg-white border-gray-200 text-[#1B4D3E] hover:bg-[#E8F3E8] shadow-sm rounded-xl transition-colors" title="Add New Service"><Plus className="h-5 w-5" /></Button>
                    <Button variant="outline" onClick={openEditModal} disabled={!selectedQueueId} className="cursor-pointer p-3 h-auto bg-white border-gray-200 text-blue-800 hover:bg-blue-100 hover:border-blue-300 shadow-sm rounded-xl transition-colors" title="Edit Service Details"><Pencil className="h-5 w-5" /></Button>
                    <Button variant="outline" onClick={() => setIsResetModalOpen(true)} disabled={!selectedQueueId} className="cursor-pointer p-3 h-auto bg-white border-gray-200 text-orange-800 hover:bg-orange-100 hover:border-orange-300 shadow-sm rounded-xl transition-colors" title="Reset Current Queue"><RotateCcw className="h-5 w-5" /></Button>
                    <Button variant="outline" onClick={() => setIsDeleteModalOpen(true)} disabled={!selectedQueueId} className="cursor-pointer p-3 h-auto bg-white border-gray-200 text-red-800 hover:bg-red-100 hover:border-red-300 shadow-sm rounded-xl transition-colors" title="Remove Service"><Trash2 className="h-5 w-5" /></Button>
                </div>
            </div>

            <Card className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="font-medium">Queue Controls</span>
                    <Button onClick={handleCallNext} disabled={actionLoading || totalWaiting === 0 || servingTicket} className="cursor-pointer bg-[#1B4D3E] hover:bg-[#153a2f]">
                        {actionLoading && !servingTicket ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />} Call Next 
                    </Button>
                    <Button onClick={handleCompleteService} disabled={actionLoading || !servingTicket} variant="outline" className="cursor-pointer text-green-800 border-green-800 hover:bg-green-100 font-bold">
                        {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Complete Service
                    </Button>
                    <Button onClick={handleSkipTicket} disabled={actionLoading || !servingTicket} variant="outline" className="cursor-pointer text-red-800 border-red-800 hover:bg-red-100 font-bold">
                        <SkipForward className="mr-2 h-4 w-4" /> Skip
                    </Button>
                </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Currently Serving</CardTitle></CardHeader><CardContent><div className="text-5xl font-bold text-[#1B4D3E] text-center">{servingTicket?.ticket_number ? (servingTicket.is_priority ? `P-${servingTicket.ticket_number}` : servingTicket.ticket_number) : '—'}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Next in Queue</CardTitle></CardHeader><CardContent><div className="text-5xl font-bold text-[#1B4D3E] text-center">{nextInQueue}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Waiting</CardTitle></CardHeader><CardContent><div className="text-5xl font-bold text-[#1B4D3E] text-center">{totalWaiting}</div></CardContent></Card>
            </div>

            <div className="space-y-2">
                <Label htmlFor="ticket-search">Search Queue</Label>
                <Input id="ticket-search" placeholder="Filter by Ticket Number (e.g., 105)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-[#E8F3E8] text-[#1B4D3E]" />
            </div>

            <Card>
                <CardHeader><CardTitle>Current Queue ({filteredQueue.length} shown)</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Ticket #</TableHead><TableHead>Customer</TableHead><TableHead>Joined</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredQueue.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-4 text-gray-500">{searchTerm ? "No matching tickets found." : "Queue is empty!"}</TableCell></TableRow>
                            ) : (
                                filteredQueue.map((item) => (
                                    <TableRow key={item.ticket_id || item.id} className={cn(item.status === 'serving' ? 'bg-yellow-50 hover:bg-yellow-100' : '', item.status === 'waiting' && item.is_priority ? 'bg-red-50/70 hover:bg-red-100/70 border border-red-500' : '')}>
                                        <TableCell className="font-medium">
                                            {item.is_priority ? <span className="text-red-800 font-bold flex items-center gap-1 transition-all duration-300"><Star className="h-4 w-4 fill-current" /> P-{item.ticket_number}</span> : item.ticket_number}
                                        </TableCell>
                                        <TableCell>{item.users?.preferred_name || item.users?.first_name || 'Anonymous'}</TableCell>
                                        <TableCell>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                        <TableCell>{item.is_priority ? <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Yes</span> : <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">No</span>}</TableCell>
                                        <TableCell><span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === "serving" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{item.status}</span></TableCell>
                                        <TableCell>
                                        {item.status === 'waiting' && (
                                            <Button size="sm" variant="ghost" onClick={() => handleTogglePriority(item)} disabled={actionLoading} className="cursor-pointer" title={item.is_priority ? "Remove Priority" : "Elevate to Priority"}>
                                                {item.is_priority ? <RefreshCw className="h-4 w-4 text-gray-500" /> : <Zap className="h-4 w-4 text-red-800" />}
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

            {/* ============================================================== */}
            {/* --- ADD QUEUE MODAL --- */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className={cn("cursor-pointer absolute inset-0 bg-black/40 backdrop-blur-sm duration-300", closingModal === 'add' ? "animate-out fade-out" : "animate-in fade-in")} 
                        onClick={() => !actionLoading && closeModal('add', setIsAddModalOpen)}
                    />
                    <div className={cn("bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 duration-300", closingModal === 'add' ? "animate-out fade-out zoom-out-95" : "animate-in fade-in zoom-in-95")}>
                        <div className="p-6 text-center border-b border-gray-100">
                            <h3 className="text-2xl font-bold text-[#1B4D3E]">Add New Service</h3>
                            <p className="text-sm text-gray-500 mt-1">Create a new queue for users to join.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[#1B4D3E] font-medium">Service Name</Label>
                                <Input placeholder="e.g., Canteen, Cashier..." value={newQueueData.name} onChange={(e) => setNewQueueData({...newQueueData, name: e.target.value})} className="bg-[#E8F3E8] py-6 rounded-xl text-lg cursor-text" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[#1B4D3E] font-medium">Max Capacity</Label>
                                    <Input type="number" value={newQueueData.max_capacity} onChange={(e) => setNewQueueData({...newQueueData, max_capacity: Number(e.target.value)})} className="bg-[#E8F3E8] py-5 rounded-xl text-center cursor-text" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[#1B4D3E] font-medium">Avg Time (mins)</Label>
                                    <Input type="number" value={newQueueData.avg_service_time} onChange={(e) => setNewQueueData({...newQueueData, avg_service_time: Number(e.target.value)})} className="bg-[#E8F3E8] py-5 rounded-xl text-center cursor-text" />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 flex gap-3 bg-gray-50 border-t border-gray-100">
                            <Button onClick={() => closeModal('add', setIsAddModalOpen)} variant="outline" className="cursor-pointer flex-1 py-6 rounded-xl font-bold text-gray-600 hover:bg-gray-100">Cancel</Button>
                            <Button onClick={handleAddQueue} disabled={actionLoading || !newQueueData.name} className="cursor-pointer flex-1 py-6 rounded-xl font-bold bg-[#1B4D3E] hover:bg-[#153a2f] text-white">
                                {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Add Service"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- EDIT QUEUE MODAL --- */}
            {isEditModalOpen && editQueueData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className={cn("cursor-pointer absolute inset-0 bg-black/40 backdrop-blur-sm duration-300", closingModal === 'edit' ? "animate-out fade-out" : "animate-in fade-in")} 
                        onClick={() => !actionLoading && closeModal('edit', setIsEditModalOpen)}
                    />
                    <div className={cn("bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 duration-300", closingModal === 'edit' ? "animate-out fade-out zoom-out-95" : "animate-in fade-in zoom-in-95")}>
                        <div className="p-6 text-center border-b border-gray-100">
                            <h3 className="text-2xl font-bold text-blue-800">Edit Service</h3>
                            <p className="text-sm text-gray-500 mt-1">Update details for {activeQueueConfig?.name}.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-blue-800 font-bold">Service Name</Label>
                                <Input placeholder="e.g., Canteen, Cashier..." value={editQueueData.name} onChange={(e) => setEditQueueData({...editQueueData, name: e.target.value})} className="bg-blue-50/50 border-blue-200 py-6 rounded-xl text-lg cursor-text" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-blue-800 font-bold">Max Capacity</Label>
                                    <Input type="number" value={editQueueData.max_capacity} onChange={(e) => setEditQueueData({...editQueueData, max_capacity: Number(e.target.value)})} className="bg-blue-50/50 border-blue-200 py-5 rounded-xl text-center cursor-text" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-blue-800 font-bold">Avg Time (mins)</Label>
                                    <Input type="number" value={editQueueData.avg_service_time} onChange={(e) => setEditQueueData({...editQueueData, avg_service_time: Number(e.target.value)})} className="bg-blue-50/50 border-blue-200 py-5 rounded-xl text-center cursor-text" />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 flex gap-3 bg-gray-50 border-t border-gray-100">
                            <Button onClick={() => closeModal('edit', setIsEditModalOpen)} variant="outline" className="cursor-pointer flex-1 py-6 rounded-xl font-bold text-gray-600 hover:bg-gray-100">Cancel</Button>
                            <Button onClick={handleEditQueue} disabled={actionLoading || !editQueueData.name} className="cursor-pointer flex-1 py-6 rounded-xl font-bold bg-blue-800 hover:bg-blue-900 text-white shadow-md">
                                {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- RESET QUEUE MODAL --- */}
            {isResetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className={cn("cursor-pointer absolute inset-0 bg-black/40 backdrop-blur-sm duration-300", closingModal === 'reset' ? "animate-out fade-out" : "animate-in fade-in")} 
                        onClick={() => !actionLoading && closeModal('reset', setIsResetModalOpen)}
                    />
                    <div className={cn("bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 duration-300", closingModal === 'reset' ? "animate-out fade-out zoom-out-95" : "animate-in fade-in zoom-in-95")}>
                        <div className="p-6 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 mb-4">
                                <RotateCcw className="h-6 w-6 text-orange-800" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Reset End-of-Day?</h3>
                            <p className="text-sm text-gray-500 mt-2 mb-4">Choose how you want to reset the Queuely system.</p>
                            
                            <div className="space-y-3">
                                <Button onClick={() => handleResetQueue(false)} variant="outline" className="cursor-pointer w-full justify-start py-4 h-auto border-gray-200 text-gray-700 hover:bg-gray-50 flex-col items-start gap-1 whitespace-normal text-left shadow-sm">
                                    <span className="font-bold text-base">Clear Current Queue</span>
                                    <span className="font-normal text-xs text-gray-500">Deletes tickets in {activeQueueConfig?.name}. Numbers continue where they left off.</span>
                                </Button>
                                <Button onClick={() => handleResetQueue(true)} className="cursor-pointer w-full justify-start py-4 h-auto bg-red-50 border border-red-200 hover:bg-red-100 flex-col items-start gap-1 whitespace-normal text-left shadow-sm">
                                    <span className="font-bold text-base text-red-900">Hard Reset (Midnight)</span>
                                    <span className="font-normal text-xs text-red-800/80">Requires SQL Script. Wipes ALL queues and forces Ticket #1 tomorrow.</span>
                                </Button>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <Button onClick={() => closeModal('reset', setIsResetModalOpen)} variant="ghost" className="cursor-pointer w-full font-bold text-gray-600 hover:text-gray-800">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DELETE QUEUE MODAL --- */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className={cn("cursor-pointer absolute inset-0 bg-black/40 backdrop-blur-sm duration-300", closingModal === 'delete' ? "animate-out fade-out" : "animate-in fade-in")} 
                        onClick={() => !actionLoading && closeModal('delete', setIsDeleteModalOpen)}
                    />
                    <div className={cn("bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 duration-300", closingModal === 'delete' ? "animate-out fade-out zoom-out-95" : "animate-in fade-in zoom-in-95")}>
                        <div className="p-6 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 border border-red-200 mb-4">
                                <Trash2 className="h-6 w-6 text-red-800" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Remove Service</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                Are you sure you want to permanently delete <span className="font-bold text-gray-900">{activeQueueConfig?.name}</span>? This will also delete any active tickets inside it.
                            </p>
                        </div>
                        <div className="p-4 flex gap-3 bg-gray-50 border-t border-gray-100">
                            <Button onClick={() => closeModal('delete', setIsDeleteModalOpen)} variant="outline" className="cursor-pointer flex-1 font-bold text-gray-700 border-gray-200 hover:bg-gray-100" disabled={actionLoading}>Cancel</Button>
                            <Button onClick={handleDeleteQueue} className="cursor-pointer flex-1 font-bold bg-red-800 hover:bg-red-900 text-white shadow-md" disabled={actionLoading}>
                                {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Yes, Delete"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}