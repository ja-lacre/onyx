"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Save, Loader2, Calendar, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { getTicketHistory } from "@/utils/queue-service";

export default function UserProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  
  // --- STATE ---
  // Removed the 'loading' state for initial page load
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Profile Form State - Initialized to empty strings
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    preferred_name: "",
    email: "Loading...", // Placeholder while fetching
    avatar_url: ""
  });

  // History State
  const [history, setHistory] = useState<any[] | null>(null); 

  // --- 1. FETCH DATA ON LOAD ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Removed setLoading(true)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        setUser(authUser);

        // B. Get Profile Details
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        if (profile) {
          setFormData({
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            preferred_name: profile.preferred_name || "",
            email: authUser.email || "N/A", 
            avatar_url: profile.avatar_url || ""
          });
        }

        // C. Get History (Tickets)
        const tickets = await getTicketHistory(supabase, authUser.id);
            if (tickets) setHistory(tickets);

            } catch (error) {
              console.error("Error loading profile:", error);
            }

          };

    fetchData();
  }, [supabase]);

  // --- 2. UPDATE FUNCTION ---
  const handleUpdateProfile = async () => {
      if (!user) return;
      setUpdating(true);

      try {
        const { error } = await supabase
          .from("users")
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            preferred_name: formData.preferred_name,
          })
          .eq("user_id", user.id);

        if (error) throw error;
        alert("Profile updated successfully!");
      } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile. Check RLS policies.");
      } finally {
        setUpdating(false);
      }
  };

  // --- HELPER: Handle Input Changes ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (!user || history === null) { 
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#1B4D3E]" />
            </div>
        );
  }
  
  return (
    <div className="min-h-screen bg-[#E8F3E8] p-4 md:p-8">
      {/* Header */}
      <header className="max-w-md  mx-auto flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#1B4D3E]">Profile</h1>
        <Button 
            variant="ghost" 
            size="icon" 
            className="text-[#1B4D3E] hover:bg-[#1B4D3E] hover:text-white"
            onClick={() => {
              router.push("/home");
              router.refresh(); 
            }}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
      </header>

      <main className="max-w-md mx-auto">
        <Card className="border-none shadow-lg p-0">
          <CardContent className="p-6">
            <Tabs defaultValue="personal" className="w-full" >
              
              {/* Tabs List */}
              <TabsList className="grid w-full grid-cols-3 bg-[#E8F3E8] mb-6">
                <TabsTrigger 
                  value="personal" 
                  className="data-[state=active]:bg-[#1B4D3E] data-[state=active]:text-white rounded-full transition-all"
                >
                  Personal
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="data-[state=active]:bg-[#1B4D3E] data-[state=active]:text-white rounded-full transition-all"
                >
                  History
                </TabsTrigger>
                <TabsTrigger 
                  value="security" 
                  className="data-[state=active]:bg-[#1B4D3E] data-[state=active]:text-white rounded-full transition-all"
                >
                  Security
                </TabsTrigger>
              </TabsList>

              {/* ================= PERSONAL TAB ================= */}
              <TabsContent value="personal" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#1B4D3E]">Personal Information</h2>
                </div>

                {/* Avatar & Email (Renders instantly) */}
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={formData.avatar_url || "https://github.com/shadcn.png"} />
                    <AvatarFallback>{formData.first_name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-[#1B4D3E]">
                      {formData.preferred_name || "Loading..."} 
                    </h3>
                    <p className="text-sm text-gray-500">{formData.email}</p>
                  </div>
                </div>

                {/* Editable Form (Renders instantly, then fields fill) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#1B4D3E] font-semibold">First Name</Label>
                    <Input 
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="bg-[#E8F3E8]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#1B4D3E] font-semibold">Last Name</Label>
                    <Input 
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="bg-[#E8F3E8]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#1B4D3E] font-semibold">Preferred Name</Label>
                  <Input 
                    name="preferred_name"
                    value={formData.preferred_name}
                    onChange={handleInputChange}
                    className="bg-[#E8F3E8]"
                  />
                  <p className="text-xs text-gray-500">This is the name we will call you by.</p>
                </div>

                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={updating}
                  className="w-full bg-[#1B4D3E] hover:bg-[#153a2f]"
                >
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </>
                  )}
                </Button>
              </TabsContent>

              {/* ================= HISTORY TAB ================= */}
              <TabsContent value="history" className="space-y-6">
                <h2 className="text-xl font-bold text-[#1B4D3E] mb-4">Queue History</h2>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {history === null ? (
                    <p className="text-center text-gray-500 py-8 flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading history...
                    </p>
                  ) : history.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No history yet.</p>
                  ) : (
                    history.map((ticket) => (
                      <div key={ticket.ticket_id} className="bg-[#E8F3E8] p-4 rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-[#1B4D3E]">{ticket.queue_id?.name || 'Unknown Queue'}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            ticket.status === 'completed' ? 'bg-green-100 text-green-700' :
                            ticket.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {ticket.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-[#1B4D3E]/80">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" /> 
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" /> 
                            {new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* ================= SECURITY TAB ================= */}
              <TabsContent value="security" className="space-y-6">
                <h2 className="text-xl font-bold text-[#1B4D3E] mb-4">Security</h2>
                <div className="space-y-3">
                  <h3 className="font-bold text-[#1B4D3E]">Change Password</h3>
                  <p className="text-sm text-gray-500">Update your password via Supabase Auth Settings.</p>
                  <Button variant="outline" className="text-[#1B4D3E] border-[#1B4D3E]" disabled>
                    Change Password
                  </Button>
                </div>
                <Separator className="my-6" />
                <div className="space-y-3">
                  <h3 className="font-bold text-red-600">Delete Account</h3>
                  <Button variant="destructive" disabled>Delete Account</Button>
                </div>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}