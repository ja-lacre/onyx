// src/app/(admin)/settings/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, ChevronDown } from "lucide-react";
import { getQueueConfig, updateQueueConfig, getQueues } from "@/utils/queue-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Queue Selection State
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [queueConfigForm, setQueueConfigForm] = useState({
    id: '',
    name: '',
    avg_service_time: 5,
    maintenance_mode: false,
    max_capacity: 0,
    auto_advance: false,
    auto_rollback: false,
  });

  const activeQueueConfig = useMemo(() => {
      return queues.find(q => q.id === selectedQueueId) || null;
  }, [queues, selectedQueueId]);

  // Fetch all queues on load
  useEffect(() => {
    const fetchAllQueues = async () => {
        try {
            const data = await getQueues(supabase);
            if (data && data.length > 0) {
                setQueues(data);
                setSelectedQueueId(data[0].id);
            }
        } catch (error) {
            console.error("Error fetching queues:", error);
            toast.error("Failed to load services.");
        } finally {
            setLoading(false);
        }
    };
    fetchAllQueues();
  }, [supabase]);

  // Fetch settings for the specifically selected queue
  useEffect(() => {
    if (!selectedQueueId) return;

    const fetchSettings = async () => {
      try {
        const data = await getQueueConfig(supabase, selectedQueueId);
        if (data) { 
          setQueueConfigForm({
            id: data.id,
            name: data.name,
            avg_service_time: data.avg_service_time,
            maintenance_mode: data.maintenance_mode,
            max_capacity: data.max_capacity || 0,
            auto_advance: data.auto_advance || false, 
            auto_rollback: data.auto_rollback || false,
          });
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };
    fetchSettings();
  }, [supabase, selectedQueueId]);

  // --- SAVE SETTINGS ---
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      await updateQueueConfig(supabase, queueConfigForm); 
      
      // Update the queue list state so the dropdown instantly reflects any name changes
      setQueues(prev => prev.map(q => q.id === queueConfigForm.id ? { ...q, name: queueConfigForm.name } : q));
      
      toast.success(`${queueConfigForm.name} settings saved successfully!`);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings. Check your console/RLS policies.");
    } finally {
      setSaving(false);
    }
  };

  // --- INPUT HANDLER ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'avg_service_time' || id === 'max_capacity') {
        const numericValue = parseInt(value, 10) || 0;
        setQueueConfigForm(prev => ({ ...prev, [id]: numericValue }));
    } else {
        setQueueConfigForm(prev => ({ ...prev, [id]: value }));
    }
  };

  if (loading) {
    return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-[#1B4D3E]" /></div>;
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1B4D3E]">Systems Settings</h1>
            <p className="text-gray-500">
              Configure your queuing system preferences and operations
            </p>
          </div>

          {/* Service Selector Dropdown */}
          <div className="relative w-full md:w-64 z-40">
              <Label className="sr-only">Select Service</Label>
              <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-white text-[#1B4D3E] font-bold shadow-sm outline-none transition-all cursor-pointer flex justify-between items-center hover:border-[#1B4D3E]/50"
              >
                  <span className="truncate pr-2">
                      {activeQueueConfig ? activeQueueConfig.name : (queues.length === 0 ? "No Services" : "Select Service")}
                  </span>
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
                                      <button
                                          key={q.id}
                                          onClick={() => {
                                              setSelectedQueueId(q.id);
                                              setIsDropdownOpen(false);
                                          }}
                                          className={cn(
                                              "w-full text-left px-4 py-3 font-bold transition-colors cursor-pointer text-sm",
                                              selectedQueueId === q.id 
                                                  ? "bg-[#E8F3E8] text-[#1B4D3E]" 
                                                  : "text-gray-600 hover:bg-gray-50 hover:text-[#1B4D3E]"
                                          )}
                                      >
                                          {q.name}
                                      </button>
                                  ))
                              )}
                          </div>
                      </div>
                  </>
              )}
          </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        
        {/* ✨ SLIDING TAB ANIMATION */}
        <TabsList className="relative grid grid-cols-2 w-full md:w-[400px] bg-[#E8F3E8] mb-6 rounded-full p-1 h-12">
            <div 
                className={cn(
                    "absolute top-1 bottom-1 bg-[#1B4D3E] rounded-full transition-all duration-300 ease-out shadow-sm",
                    activeTab === "general" ? "left-1 right-[calc(50%+2px)]" : "left-[calc(50%+2px)] right-1"
                )}
            />
            <TabsTrigger value="general" className="cursor-pointer relative z-10 w-full h-full rounded-full font-semibold text-sm transition-colors duration-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white text-[#1B4D3E] hover:text-[#1B4D3E]/70">General</TabsTrigger>
            <TabsTrigger value="queue-config" className="cursor-pointer relative z-10 w-full h-full rounded-full font-semibold text-sm transition-colors duration-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white text-[#1B4D3E] hover:text-[#1B4D3E]/70">Queue Config</TabsTrigger>
        </TabsList>

        {/* General Settings Tab Content */}
        <TabsContent value="general" className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Manage general system information for {activeQueueConfig?.name || "this service"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input 
                  id="name" 
                  placeholder="Enter service name" 
                  value={queueConfigForm.name}
                  onChange={handleInputChange}
                  className="bg-[#E8F3E8] border-none cursor-text" 
                  disabled={!selectedQueueId}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2 border p-5 rounded-xl bg-[#E8F3E8] border-none">
                <div className="space-y-1">
                  <Label className="text-base font-bold text-[#1B4D3E]">Maintenance Mode</Label>
                  <p className="text-sm text-gray-600 font-medium">
                    Temporarily disable the queuing system for maintenance.
                  </p>
                </div>
                {/* ✨ UPDATED: Larger switch with dark green branding! */}
                <div className="pl-4">
                  <Switch 
                    checked={queueConfigForm.maintenance_mode} 
                    disabled={!selectedQueueId}
                    onCheckedChange={(checked) => setQueueConfigForm(prev => ({...prev, maintenance_mode: checked}))}
                    className="cursor-pointer scale-125 data-[state=checked]:bg-[#1B4D3E] data-[state=unchecked]:bg-gray-300 shadow-sm"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveChanges} disabled={saving || !selectedQueueId} className="cursor-pointer bg-[#1B4D3E] hover:bg-[#153a2f] rounded-xl font-bold">
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Queue Config Tab Content */}
        <TabsContent value="queue-config" className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Queue Configuration</CardTitle>
              <CardDescription>
                Adjust how {activeQueueConfig?.name || "this queue"} operates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="max_capacity">Maximum Queue Length</Label>
                  <Input
                    id="max_capacity"
                    placeholder="e.g., 100"
                    onChange={handleInputChange}
                    value={queueConfigForm.max_capacity}
                    className="bg-[#E8F3E8] border-none cursor-text"
                    disabled={!selectedQueueId}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avg_service_time">Average Service Time (minutes)</Label>
                  <Input 
                    id="avg_service_time"
                    placeholder="e.g., 15" 
                    value={queueConfigForm.avg_service_time}
                    onChange={handleInputChange}
                    className="bg-[#E8F3E8] border-none cursor-text" 
                    disabled={!selectedQueueId}
                  />
                </div>
              </div>
              <div className="space-y-4 pt-4">
                
                {/* Auto-advance Queue */}
                <div className="flex items-center justify-between space-x-2 border p-5 rounded-xl bg-[#E8F3E8] border-none">
                    <div className="space-y-1">
                        <Label className="text-base font-bold text-[#1B4D3E]">Auto-advance Queue</Label>
                        <p className="text-sm text-gray-600 font-medium">
                            Automatically call the next customer when service completes.
                        </p>
                    </div>
                    {/* ✨ UPDATED: Larger switch with dark green branding! */}
                    <div className="pl-4">
                        <Switch 
                            checked={queueConfigForm.auto_advance} 
                            disabled={!selectedQueueId}
                            onCheckedChange={(checked) => setQueueConfigForm(prev => ({...prev, auto_advance: checked}))}
                            className="cursor-pointer scale-125 data-[state=checked]:bg-[#1B4D3E] data-[state=unchecked]:bg-gray-300 shadow-sm"
                        />
                    </div>
                </div>

                {/* Auto-rollback */}
                <div className="flex items-center justify-between space-x-2 border p-5 rounded-xl bg-[#E8F3E8] border-none">
                    <div className="space-y-1">
                        <Label className="text-base font-bold text-[#1B4D3E]">Auto-Rollback</Label>
                        <p className="text-sm text-gray-600 font-medium">
                            Automatically put the customer at the end of the queue if they are a no show.
                        </p>
                    </div>
                    {/* ✨ UPDATED: Larger switch with dark green branding! */}
                    <div className="pl-4">
                        <Switch 
                            checked={queueConfigForm.auto_rollback} 
                            disabled={!selectedQueueId}
                            onCheckedChange={(checked) => setQueueConfigForm(prev => ({...prev, auto_rollback: checked}))}
                            className="cursor-pointer scale-125 data-[state=checked]:bg-[#1B4D3E] data-[state=unchecked]:bg-gray-300 shadow-sm"
                        />
                    </div>
                </div>
             </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveChanges} disabled={saving || !selectedQueueId} className="cursor-pointer bg-[#1B4D3E] hover:bg-[#153a2f] rounded-xl font-bold">
                 {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}