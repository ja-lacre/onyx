// src/lib/queue-service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from "@supabase/supabase-js";

export async function getQueueMetrics(
    supabase: SupabaseClient,
    queueId: string,
    ticketCreatedAt: string,
    userTicketId: string, 
    userTicketStatus: string 
) {
        
    const queueConfig = await getQueueConfig(supabase);
    const dynamicAvgServiceTime = queueConfig?.avg_service_time || 5;
    
    // 1. Count the person currently being served (excluding the user's own ticket).
    const { count: servingCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .eq("status", "serving")
        .neq("ticket_id", userTicketId); 
    
    // 2. Count all people who are 'waiting' and joined BEFORE this ticket.
    const { count: waitingAhead } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .eq("status", "waiting")
        .lt("created_at", ticketCreatedAt);

    // 3. Count the total number of people who are waiting (including the user if they are waiting)
    const { count: totalWaiting } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .eq("status", "waiting");

    let peopleAhead = 0;

    if (userTicketStatus === 'serving') {
        // If the user is currently being served, they are position 1 (0 people ahead)
        peopleAhead = 0; 
    } else {
        // If waiting: count the one currently serving (if any) + all waiting ahead.
        peopleAhead = (servingCount || 0) + (waitingAhead || 0); 
    }

    const position = peopleAhead + 1; // 1-based position
    
    // Correct calculation for totalInLine: (Others serving) + (Total people waiting) + (1 if the user is serving)
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
  return new Date(dateString).toLocaleTimeString(undefined, {
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
      .order('created_at', { ascending: true }); // FIX: Sorting by created_at to honor requeue logic
    
    if (error) throw error;
    return data;
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
    
    // FIX: Only update timestamp if it's an explicit requeue-to-back action
    if (newStatus === 'waiting' && requeueBack) {
        updates.created_at = new Date().toISOString();
    }
    
    // FIX: Changed to check data.length instead of relying on the 'count' property
    // which causes TypeScript conflicts after an update.
    const { data, error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("ticket_id", ticketId)
      // Requesting updated rows ensures 'data' is populated if successful
      .select('*'); 

    if (error) throw error;
    // Check data length instead of count
    if (!data || data.length === 0) throw new Error(`Ticket ${ticketId} not found or already processed.`);
    return true;
}


export async function callNextInLine(
    supabase: SupabaseClient,
    queueId: string,
    forceAdvance: boolean = false 
) {
    // --- STEP 1: RETRIEVE CONFIGURATION ---
   const config = await getQueueConfig(supabase);
    if (!config) {
        console.error("Call Next failed: Queue configuration is missing.");
        return null; 
    }
    const autoAdvanceEnabled = config.auto_advance;
    
    // Check if there is already someone serving.
    const { count: servingCountRaw } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .eq("status", "serving");
    
    const servingCount: number = servingCountRaw ?? 0;

    if (servingCount > 0 && !autoAdvanceEnabled && !forceAdvance) {
        return null;
    }

    // --- STEP 2: FIND THE NEXT WAITING TICKET ---
    const { data: waitingTickets, error } = await supabase
        .from('tickets')
        .select('ticket_id') 
        .eq('queue_id', queueId)
        .eq('status', 'waiting')
        .order('is_priority', { ascending: false })
        .order('created_at', { ascending: true }) // FIX: Sorting by created_at to pick the oldest waiting ticket
        .limit(1);

    if (error) throw error;

    // --- STEP 3: ADVANCE THE TICKET ---
    if (waitingTickets && waitingTickets.length > 0) {
        const nextTicket = waitingTickets[0];
        // Use the updated utility to mark it as serving
        await updateTicketStatus(supabase, nextTicket.ticket_id, 'serving');
        return nextTicket;
    }

    return null; // Queue is empty
}

  export async function getQueueConfig(supabase: SupabaseClient) {
        const { data, error } = await supabase
          .from('queues')
          .select('id, name, avg_service_time,max_capacity, maintenance_mode, auto_advance, auto_rollback') // Select relevant columns (name is the display name)
          .maybeSingle(); 
          
    
        if (error && error.code !== 'PGRST116') throw error;
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
    // 1. Fetch Queue Configuration (for ID)
    const { data: queueConfig } = await supabase
        .from('queues')
        .select('id') // Only need the ID for filtering
        .single();

    if (!queueConfig) {
        throw new Error("Queue configuration not found.");
    }

    const queueId = queueConfig.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 2. Fetch required counts (as originally defined)
    
    // COUNT OF COMPLETED SERVICES (Status: completed, Created Today)
    const { count: completedServicesCount } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .eq("status", "completed")
        .gte("created_at", today); 

    // TOTAL CUSTOMERS TODAY (Count all statuses created today)
    const { count: totalCustomersCount } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .gte("created_at", today);
        
    // CURRENT QUEUE LENGTH (Statuses: waiting, serving)
    const { count: currentQueueLength } = await supabase
        .from("tickets")
        .select("ticket_id", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .in("status", ["waiting", "serving"]);

    // --- START NEW AVERAGE WAIT TIME CALCULATION ---
    
    // 3. Fetch all completed tickets from today with necessary timestamps
    const { data: completedTickets, error: fetchError } = await supabase
        .from("tickets")
        .select("created_at, completed_at")
        .eq("queue_id", queueId)
        .eq("status", "completed")
        .gte("created_at", today)
        .not('completed_at', 'is', null); // Must have a completed_at time

    if (fetchError) throw fetchError;

    let totalWaitTimeSeconds = 0;
    const actualCompletedCount = completedTickets.length;

    if (actualCompletedCount > 0) {
        completedTickets.forEach(ticket => {
            const joinedTime = new Date(ticket.created_at).getTime();
            const completionTime = new Date(ticket.completed_at).getTime();
            
            // Calculate wait time (in milliseconds)
            const waitTimeMs = completionTime - joinedTime;
            
            // Sum up total wait time in seconds
            totalWaitTimeSeconds += waitTimeMs / 1000;
        });
    }

    // 4. Calculate Average Wait Time
    const averageWaitTimeMinutes = 
        actualCompletedCount > 0
        ? Math.round((totalWaitTimeSeconds / actualCompletedCount) / 60)
        : 0;

    const averageWaitTimeDisplay = averageWaitTimeMinutes > 60 
        ? `${Math.round(averageWaitTimeMinutes / 60)} hrs` 
        : `${averageWaitTimeMinutes} mins`;
    
    // --- END NEW AVERAGE WAIT TIME CALCULATION ---


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
    
    // Helper to format the date as YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Array of day names for chart labels
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i); 

        // Set the start of the day (e.g., 2025-12-05 00:00:00)
        const dateStart = formatDate(date);
        
        // Set the end of the day (the start of the next day)
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        const dateEnd = formatDate(nextDate);

        // Query the count of all tickets created within this 24-hour period
        const { count } = await supabase
            .from('tickets')
            .select('ticket_id', { count: 'exact', head: true })
            .eq('queue_id', queueId)
            .gte('created_at', dateStart)
            .lt('created_at', dateEnd);

        dataPoints.push({
            name: dayNames[date.getDay()], // Get the weekday name
            volume: count || 0,
        });
    }
    return dataPoints;
}