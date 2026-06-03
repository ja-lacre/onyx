// src/lib/queue-service.ts
import { SupabaseClient } from "@supabase/supabase-js";

const AVG_WAIT_TIME_MINS = 5; // Average service time per ticket in minutes

export async function getQueueMetrics(
      supabase: SupabaseClient,
      queueId: string,
      ticketCreatedAt: string
  ) {
      // 1. Count the person currently being served (if any).
      // This is always 1 or 0, and they are always considered "ahead".
      const { count: servingCount } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("queue_id", queueId)
          .eq("status", "serving");
      
      // 2. Count all people who are 'waiting' and joined BEFORE this ticket.
      const { count: waitingAhead } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("queue_id", queueId)
          .eq("status", "waiting")
          .lt("created_at", ticketCreatedAt);

      // 3. Count the total number of people who are waiting (excluding the serving ticket)
      const { count: totalWaiting } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("queue_id", queueId)
          .eq("status", "waiting");
      
      // Total people ahead = (Serving Count) + (Waiting Tickets Ahead)
      const peopleAhead = (servingCount || 0) + (waitingAhead || 0);

      // The user's position is the number of people ahead PLUS THEMSELVES (+1).
      const position = peopleAhead + 1;
      
      // Total in line = (Serving Count) + (Total Waiting Count)
      const totalInLine = (servingCount || 0) + (totalWaiting || 0);
      
      const waitTime = peopleAhead * AVG_WAIT_TIME_MINS;
      
      const serviceTime = new Date(Date.now() + waitTime * 60 * 1000);
      const serviceAround = serviceTime.toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit' 
      });

      return {
          position,
          totalInLine, // This now reflects all active tickets (serving + waiting)
          estimatedWait: position === 1 ? "Next!" : `~${waitTime} mins`,
          serviceAround,
      };
}

export async function joinQueue(
    supabase: SupabaseClient,
    userId: string,
    queueId: string
  ) {
    // 1. CHECK for existing ticket
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
        .single(); // Use .single() to get an object, not an array
    
    if (queueError) {
        throw new Error("Failed to retrieve queue configuration.");
    }
    
    // 2. Get current queue length (This part is correct)
    const { count: currentQueueLength } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .in("status", ["waiting", "serving"]);

    // 3. Check Capacity using the correctly fetched value
    const maxCapacity = queueConfig.max_capacity;
    
    if (maxCapacity && currentQueueLength && currentQueueLength >= maxCapacity) {
        throw new Error(`Queue is full. Max capacity: ${maxCapacity}`);
    }
  
    // 2. INSERT new ticket
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

/**
 * LEAVE QUEUE (Updated for ticket_id)
 */
export async function leaveQueue(supabase: SupabaseClient, ticketId: string) {
  const { error } = await supabase
    .from("tickets")
    .update({ status: "cancelled" })
    .eq("ticket_id", ticketId);

  if (error) throw error;
  return true;
}

export function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}


export async function getActiveQueue(supabase: SupabaseClient, queueId: string) {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *, 
        user_id(first_name, preferred_name)
      `)
      .eq('queue_id', queueId) 
      .in('status', ['waiting', 'serving'])
      .order('is_priority', { ascending: false })
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
}

/**
 * Generic function to update a ticket's status (used for Complete/Skip).
 */
export async function updateTicketStatus(
  supabase: SupabaseClient,
  ticketId: string,
  newStatus: 'completed' | 'cancelled'
) {
  const { error, count } = await supabase
    .from("tickets")
    .update({ status: newStatus })
    .eq("ticket_id", ticketId)
    .select('*', { count: 'exact' });

  if (error) throw error;
  if (count === 0) throw new Error(`Ticket ${ticketId} not found or already processed.`);
  return true;
}


export async function callNextInLine(
      supabase: SupabaseClient,
      currentServingTicketId: string | null,
      queueId: string
    ) {
      let nextTicket = null;

      // 1. Mark currently serving ticket as 'completed'
      if (currentServingTicketId) {
        await updateTicketStatus(supabase, currentServingTicketId, 'completed');
      }

    
      const { data: waitingTickets, error } = await supabase
        .from('tickets')
        .select('ticket_id') 
        .eq('queue_id', queueId)
        .eq('status', 'waiting')
        .order('is_priority', { ascending: false }) // Priority first
        .order('created_at', { ascending: true })   // Oldest time second
        .limit(1);

      if (error) throw error;

      // 3. Update the found ticket to 'serving'
      if (waitingTickets && waitingTickets.length > 0) {
        nextTicket = waitingTickets[0];
        await updateTicketStatus(supabase, nextTicket.ticket_id, 'serving');
      }

      return nextTicket;
  }

  export async function getQueueConfig(supabase: SupabaseClient) {
        const { data, error } = await supabase
          .from('queues')
          .select('id, name, avg_service_time,max_capacity, maintenance_mode') // Select relevant columns (name is the display name)
          .single();
        
        if (error) throw error;
        return data;
}

/**
 * Updates the global system settings.
 */
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

export async function getDashboardStats(supabase: SupabaseClient) {
    // We need the queue ID for filtering and the average service time for calculations.
    const { data: queueConfig } = await supabase
        .from('queues')
        .select('id, avg_service_time')
        .single();

    if (!queueConfig) {
        throw new Error("Queue configuration not found.");
    }

    const queueId = queueConfig.id;
    const avgServiceTime = queueConfig.avg_service_time || 5; 

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 1. Get COUNT OF COMPLETED SERVICES (Status: completed, Created Today)
    const { count: completedServicesCount } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .eq("status", "completed")
        // Use created_at for simple check if completed_at is NULL for older tickets
        .gte("created_at", today); 

    // 2. Get TOTAL CUSTOMERS TODAY (Statuses: completed, cancelled, waiting, serving)
    const { count: totalCustomersCount } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", queueId)
        // Check only created_at to count all entries from today
        .gte("created_at", today);
        
    // 3. Get CURRENT QUEUE LENGTH (Statuses: waiting, serving)
    const { count: currentQueueLength } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .in("status", ["waiting", "serving"]);

    // Average Wait Time (Simple estimate based on current queue)
    const estimatedWaitMinutes = (currentQueueLength || 0) * avgServiceTime;

    return {
        // FIX: Use the new totalCustomersCount
        totalCustomersToday: totalCustomersCount || 0,
        // FIX: Use the completedServicesCount
        completedServices: completedServicesCount || 0, 
        currentQueueLength: currentQueueLength || 0,
        averageWaitTime: estimatedWaitMinutes > 60 
            ? `${Math.round(estimatedWaitMinutes / 60)} hrs` 
            : `${estimatedWaitMinutes} mins`,
    };
}