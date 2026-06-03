// src/app/(dashboard)/settings/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { getQueueConfig, updateQueueConfig } from "@/utils/queue-service";

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  

  const [queueConfigForm, setQueueConfigForm] = useState({
    id: '',
    name: '',
    avg_service_time: 5,
    maintenance_mode: false,
    max_capacity: 0,
  });

  // --- FETCH SETTINGS ---
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getQueueConfig(supabase);
        setQueueConfigForm({
          id: data.id,
          name: data.name,
          avg_service_time: data.avg_service_time,
          maintenance_mode: data.maintenance_mode,
          max_capacity: data.max_capacity || 0,
        });
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [supabase]);

  // --- SAVE SETTINGS ---
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      // Send the entire form data to the update helper
      await updateQueueConfig(supabase, queueConfigForm); 
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Check your console/RLS policies.");
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
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#1B4D3E]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B4D3E]">Systems Settings</h1>
        <p className="text-gray-500">
          Configure your queuing system preferences and operations
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] bg-[#E8F3E8]">
          <TabsTrigger
            value="general"
            className="data-[state=active]:bg-[#1B4D3E] data-[state=active]:text-white"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="queue-config"
            className="data-[state=active]:bg-[#1B4D3E] data-[state=active]:text-white"
          >
            Queue Config
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab Content */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Manage general system information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input 
                  id="name" 
                  placeholder="Enter company name" 
                  value={queueConfigForm.name}
                  onChange={handleInputChange}
                  className="bg-[#E8F3E8] border-none" 
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-[#E8F3E8] border-none">
                <div className="space-y-0.5">
                  <Label className="text-base">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable the queuing system for maintenance.
                  </p>
                </div>
                <Switch 
                  checked={queueConfigForm.maintenance_mode} 
                  onCheckedChange={(checked) => setQueueConfigForm(prev => ({...prev, maintenance_mode: checked}))}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveChanges} disabled={saving} className="bg-[#1B4D3E] hover:bg-[#153a2f]">
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Queue Config Tab Content (Simplified/Static for now) */}
        <TabsContent value="queue-config">
          <Card>
            <CardHeader>
              <CardTitle>Queue Configuration</CardTitle>
              <CardDescription>
                Adjust how your queues operate.
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
                    className="bg-[#E8F3E8] border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avg_service_time">Average Service Time (minutes)</Label>
                  <Input 
                    id="avg_service_time"
                    placeholder="e.g., 15" 
                    value={queueConfigForm.avg_service_time}
                    onChange={handleInputChange}
                    className="bg-[#E8F3E8] border-none" 
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground pt-4">Other configuration switches here...</p>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveChanges} disabled={saving} className="bg-[#1B4D3E] hover:bg-[#153a2f]">
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