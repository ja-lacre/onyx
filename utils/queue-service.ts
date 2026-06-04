// src/utils/queue-service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from "@supabase/supabase-js";

export async function getQueues(supabase: SupabaseClient) {
    const { data, error } = await supabase
        .from('queues')
        .select('*')
        .order('name');
    
    if (error) throw error;
    return data || [];
}

export async function getQueueMetrics(
    supabase: SupabaseClient,
    queueId: string,
    ticketCreatedAt: string,
    userTicketId: string, 
    userTicketStatus: string 
) {
        
    const queueConfig = await getQueueConfig(supabase, queueId);
    const dynamicAvgServiceTime = queueConfig?.avg_service_time || 5;
    
    const { count: servingCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .eq("status", "serving")
        .neq("ticket_id", userTicketId); 
    
    const { count: waitingAhead } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .eq("status", "waiting")
        .lt("created_at", ticketCreatedAt);

    const { count: totalWaiting } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .eq("status", "waiting");

    let peopleAhead = 0;

    if (userTicketStatus === 'serving') {
        peopleAhead = 0; 
    } else {
        peopleAhead = (servingCount || 0) + (waitingAhead || 0); 
    }

    const position = peopleAhead + 1; 
    const totalInLine = (servingCount || 0) + (totalWaiting || 0) + (userTicketStatus === 'serving' ? 1 : 0);
    const waitTime = peopleAhead * dynamicAvgServiceTime;
    const serviceTime = new Date(Date.now() + waitTime * 60 * 1000);
    const serviceAround = serviceTime.toLocaleTimeString(undefined, { 
        hour: 'numeric', 
        minute: '2-digit' 
    });

    return {
        position,
        totalInLine,
        estimatedWait: peopleAhead === 0 ? "Next!" : `~${waitTime} mins`,
        serviceAround,
    };
}

export async function joinQueue(
    supabase: SupabaseClient,
    userId: string,
    queueId: string
  ) {
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["waiting", "serving"])
      .single();

    if (existingTicket) {
      throw new Error("You already have an active ticket.");
    }
  
    const { data: queueConfig, error: queueError } = await supabase
        .from('queues')
        .select('max_capacity')
        .eq('id', queueId)
        .single(); 
    
    if (queueError) {
        throw new Error("Failed to retrieve queue configuration.");
    }
    
    const { count: currentQueueLength } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .in("status", ["waiting", "serving"]);

    const maxCapacity = queueConfig.max_capacity;
    
    if (maxCapacity && currentQueueLength && currentQueueLength >= maxCapacity) {
        throw new Error(`Queue is full. Max capacity: ${maxCapacity}`);
    }
  
    const { data, error } = await supabase
      .from("tickets")
      .insert([
        {
          user_id: userId,
          queue_id: queueId,
          status: "waiting",
          is_priority: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
}

export async function leaveQueue(supabase: SupabaseClient, ticketId: string) {
  const { error } = await supabase
    .from("tickets")
    .update({ status: "cancelled" })
    .eq("ticket_id", ticketId);

  if (error) throw error;
  return true;
}

export function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function getActiveQueue(supabase: SupabaseClient, queueId: string) {
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .select('*') 
      .eq('queue_id', queueId) 
      .in('status', ['waiting', 'serving'])
      .order('is_priority', { ascending: false })
      .order('created_at', { ascending: true }); 
    
    if (ticketError) throw new Error(`Supabase Error: ${ticketError.message}`);
    if (!tickets || tickets.length === 0) return [];

    const userIds = [...new Set(tickets.map(t => t.user_id).filter(Boolean))];

    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
        const { data: usersData, error: userError } = await supabase
            .from('users')
            .select('user_id, first_name, preferred_name')
            .in('user_id', userIds);

        if (!userError && usersData) {
            usersData.forEach(u => { usersMap[u.user_id] = u; });
        }
    }

    return tickets.map(ticket => ({
        ...ticket,
        users: usersMap[ticket.user_id] || null
    }));
}

export async function updateTicketStatus(
    supabase: SupabaseClient,
    ticketId: string,
    newStatus: 'completed' | 'cancelled' | 'serving' | 'waiting',
    newPriority?: boolean,
    requeueBack?: boolean
  ) {
    const updates: any = { status: newStatus };

    if (newPriority !== undefined) {
        updates.is_priority = newPriority;
    }

    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString(); 
    }
    
    if (newStatus === 'waiting' && requeueBack) {
        updates.created_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("ticket_id", ticketId)
      .select('*'); 

    if (error) throw error;
    if (!data || data.length === 0) throw new Error(`Ticket ${ticketId} not found.`);
    return true;
}

export async function callNextInLine(
    supabase: SupabaseClient,
    queueId: string,
    forceAdvance: boolean = false 
) {
   const config = await getQueueConfig(supabase, queueId);
    if (!config) {
        console.error("Call Next failed: Queue configuration is missing.");
        return null; 
    }
    const autoAdvanceEnabled = config.auto_advance;
    
    const { count: servingCountRaw } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .eq("status", "serving");
    
    const servingCount: number = servingCountRaw ?? 0;

    if (servingCount > 0 && !autoAdvanceEnabled && !forceAdvance) {
        return null;
    }

    const { data: waitingTickets, error } = await supabase
        .from('tickets')
        .select('ticket_id') 
        .eq('queue_id', queueId)
        .eq('status', 'waiting')
        .order('is_priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

    if (error) throw error;

    if (waitingTickets && waitingTickets.length > 0) {
        const nextTicket = waitingTickets[0];
        await updateTicketStatus(supabase, nextTicket.ticket_id, 'serving');
        return nextTicket;
    }

    return null; 
}

export async function getQueueConfig(supabase: SupabaseClient, queueId?: string) {
    let query = supabase
        .from('queues')
        .select('id, name, avg_service_time,max_capacity, maintenance_mode, auto_advance, auto_rollback');
        
    if (queueId) {
        query = query.eq('id', queueId);
    }
    
    const { data, error } = await query.limit(1).maybeSingle(); 
      
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function updateQueueConfig(supabase: SupabaseClient, newConfig: any) {
    const { id, ...updates } = newConfig; 
    
    const { error } = await supabase
    .from('queues') 
    .update(updates) 
    .eq('id', id); 
    
    if (error) throw error;
    return true;
}

export async function getTicketHistory(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
        .from('tickets')
        .select(`
          ticket_id, 
          ticket_number,
          created_at, 
          status,
          queue_id ( 
              name 
          )
        `)
        .eq('user_id', userId)
        .in('status', ['completed', 'cancelled']) 
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

export async function getDashboardStats(supabase: SupabaseClient, queueId?: string) {
    let targetQueueId = queueId;

    if (!targetQueueId) {
        const { data: queueConfig } = await supabase
            .from('queues')
            .select('id') 
            .limit(1)
            .single();

        if (!queueConfig) throw new Error("Queue configuration not found.");
        targetQueueId = queueConfig.id;
    }

    const today = new Date().toISOString().split('T')[0]; 
    
    const { count: completedServicesCount } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", targetQueueId)
        .eq("status", "completed")
        .gte("created_at", today); 

    const { count: totalCustomersCount } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", targetQueueId)
        .gte("created_at", today);
        
    const { count: currentQueueLength } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", targetQueueId)
        .in("status", ["waiting", "serving"]);
    
    const { data: completedTickets, error: fetchError } = await supabase
        .from("tickets")
        .select("created_at, completed_at")
        .eq("queue_id", targetQueueId)
        .eq("status", "completed")
        .gte("created_at", today)
        .not('completed_at', 'is', null); 

    if (fetchError) throw fetchError;

    let totalWaitTimeSeconds = 0;
    const actualCompletedCount = completedTickets.length;

    if (actualCompletedCount > 0) {
        completedTickets.forEach(ticket => {
            const joinedTime = new Date(ticket.created_at).getTime();
            const completionTime = new Date(ticket.completed_at).getTime();
            const waitTimeMs = completionTime - joinedTime;
            totalWaitTimeSeconds += waitTimeMs / 1000;
        });
    }

    const averageWaitTimeMinutes = 
        actualCompletedCount > 0
        ? Math.round((totalWaitTimeSeconds / actualCompletedCount) / 60)
        : 0;

    const averageWaitTimeDisplay = averageWaitTimeMinutes > 60 
        ? `${Math.round(averageWaitTimeMinutes / 60)} hrs` 
        : `${averageWaitTimeMinutes} mins`;

    return {
        totalCustomersToday: totalCustomersCount || 0,
        completedServices: completedServicesCount || 0, 
        currentQueueLength: currentQueueLength || 0,
        averageWaitTime: averageWaitTimeDisplay, 
    };
}

export async function getWeeklyQueueVolume(supabase: SupabaseClient, queueId: string) {
    const dataPoints = [];
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i); 

        const dateStart = formatDate(date);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        const dateEnd = formatDate(nextDate);

        const { count } = await supabase
            .from('tickets')
            .select('ticket_id', { count: 'exact', head: true })
            .eq('queue_id', queueId)
            .gte('created_at', dateStart)
            .lt('created_at', dateEnd);

        dataPoints.push({
            name: dayNames[date.getDay()],
            volume: count || 0,
        });
    }
    return dataPoints;
}

export async function addQueue(
    supabase: SupabaseClient,
    queueData: { name: string; max_capacity: number; avg_service_time: number }
) {
    const { data, error } = await supabase
        .from('queues')
        .insert([{
            name: queueData.name,
            max_capacity: queueData.max_capacity,
            avg_service_time: queueData.avg_service_time,
            maintenance_mode: false,
            auto_advance: true,
            auto_rollback: false
        }])
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function resetQueue(supabase: SupabaseClient, queueId?: string, isHardReset: boolean = false) {
    if (isHardReset) {
        const { error } = await supabase.rpc('hard_reset_queue_numbers');
        if (error) throw new Error(error.message);
        return true;
    } else {
        if (!queueId) throw new Error("Queue ID is required for a soft reset");
        const { error } = await supabase
            .from('tickets')
            .delete()
            .eq('queue_id', queueId);
            
        if (error) throw new Error(error.message);
        return true;
    }
}

// --- NEW FUNCTION: DELETE QUEUE ---
export async function deleteQueue(supabase: SupabaseClient, queueId: string) {
    // We first delete all tickets inside this queue to prevent database crashing from "foreign key" constraint errors!
    await supabase.from('tickets').delete().eq('queue_id', queueId);
    
    // Then we safely delete the actual queue
    const { error } = await supabase
        .from('queues')
        .delete()
        .eq('id', queueId);
        
    if (error) throw new Error(error.message);
    return true;
}