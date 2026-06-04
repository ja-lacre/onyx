// src/app/(user)/profile/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { ArrowLeft, Save, Loader2, Calendar, Clock, Camera, Lock, KeyRound, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { getTicketHistory } from "@/utils/queue-service";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/utils/cropImage";
import { cn } from "@/lib/utils";

export default function UserProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("personal");

  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: "", last_name: "", preferred_name: "", email: "Loading...", avatar_url: ""
  });
  
  // --- PASSWORD MODAL STATES ---
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // --- NEW: FORGOT PASSWORD STATES ---
  const [isForgotConfirmModalOpen, setIsForgotConfirmModalOpen] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const [avatarLoading, setAvatarLoading] = useState(false); 
  const [history, setHistory] = useState<any[] | null>(null); 

  // --- CROPPER STATE ---
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        setUser(authUser);

        const { data: profile } = await supabase.from("users").select("*").eq("user_id", authUser.id).single();

        if (profile) {
          setFormData({
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            preferred_name: profile.preferred_name || "",
            email: authUser.email || "N/A", 
            avatar_url: profile.avatar_url || ""
          });
        }

        const tickets = await getTicketHistory(supabase, authUser.id);
        if (tickets) setHistory(tickets);
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };
    fetchData();
  }, [supabase]);

  const handleUpdateProfile = async () => {
      if (!user) return;
      setUpdating(true);
      try {
        const { error } = await supabase.from("users").update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            preferred_name: formData.preferred_name,
          }).eq("user_id", user.id);

        if (error) throw error;
        toast.success("Profile updated successfully!");
      } catch (error) {
        console.error("Error updating profile:", error);
        toast.error("Failed to update profile.");
      } finally {
        setUpdating(false);
      }
  };

  const handlePasswordSubmit = async () => {
      if (!currentPassword) return toast.error("Please enter your current password.");
      if (newPassword.length < 8) return toast.error("New password must be at least 8 characters.");
      if (newPassword !== confirmPassword) return toast.error("New passwords do not match.");

      setPasswordLoading(true);
      try {
          const { error: signInError } = await supabase.auth.signInWithPassword({
              email: user.email,
              password: currentPassword
          });

          if (signInError) throw new Error("Incorrect current password.");

          const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
          if (updateError) throw new Error(updateError.message);

          toast.success("Password successfully updated!");
          setIsPasswordModalOpen(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
      } catch (error: any) {
          toast.error(error.message || "Failed to update password.");
      } finally {
          setPasswordLoading(false);
      }
  };

  const handleForgotPassword = async () => {
      if (!user?.email) return;
      setForgotPasswordLoading(true);
      try {
          const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
              redirectTo: `${window.location.origin}/reset-password`,
          });
          if (error) throw error;
          toast.success("A password reset link has been sent to your email.");
          
          setIsForgotConfirmModalOpen(false);
          setIsPasswordModalOpen(false);
      } catch (error: any) {
          toast.error("Failed to send reset email.");
      } finally {
          setForgotPasswordLoading(false);
      }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || "");
        setIsCropModalOpen(true);
      });
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = ''; 
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!user || !imageSrc || !croppedAreaPixels) return;
    setAvatarLoading(true);
    setIsCropModalOpen(false);

    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error("Could not crop image");

      const file = new File([croppedImageBlob], "avatar.jpeg", { type: "image/jpeg" });
      const fileName = `${user.id}/${Date.now()}.jpeg`; 

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newAvatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase.from("users").update({ avatar_url: newAvatarUrl }).eq("user_id", user.id);
      if (updateError) throw updateError;
      
      setFormData(prev => ({ ...prev, avatar_url: newAvatarUrl }));
      toast.success("Profile picture updated!");

    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload profile picture.");
    } finally {
      setAvatarLoading(false);
      setImageSrc(null); 
    }
  };

  if (!user || history === null) return <div className="h-screen flex items-center justify-center bg-[#E8F3E8]"><Loader2 className="h-10 w-10 animate-spin text-[#1B4D3E]" /></div>;

  return (
    // ✨ CHANGED: Replaced p-4 md:p-8 with px-4 md:px-8 pb-8 pt-0 to shrink the top gap
    <div className="min-h-screen bg-[#E8F3E8] px-4 md:px-8 pb-8 pt-0">
      
      {/* ✨ CHANGED: Reorganized to put the back button behind the title and made it a visible outline button */}
      <header className="max-w-md mx-auto flex items-center gap-4 mb-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push("/home")} 
          className="cursor-pointer h-10 w-10 border-gray-300 text-[#1B4D3E] bg-white hover:bg-[#E8F3E8] shadow-sm transition-colors"
        >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Go Back</span>
        </Button>
        <h1 className="text-3xl font-bold text-[#1B4D3E]">Profile</h1>
      </header>

      <main className="max-w-md mx-auto relative">
        <Card className="border-none shadow-lg p-0 overflow-hidden rounded-2xl">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              
              <TabsList className="relative grid grid-cols-3 w-full bg-[#E8F3E8] mb-6 rounded-full p-1 h-12">
                <div 
                    className={cn(
                        "absolute top-1 bottom-1 bg-[#1B4D3E] rounded-full transition-all duration-300 ease-out shadow-sm",
                        activeTab === "personal" ? "left-1 right-[calc(66.666%+2px)]" : 
                        activeTab === "history" ? "left-[calc(33.333%+2px)] right-[calc(33.333%+2px)]" : 
                        "left-[calc(66.666%+2px)] right-1"
                    )}
                />
                <TabsTrigger value="personal" className="cursor-pointer relative z-10 w-full h-full rounded-full font-semibold text-sm transition-colors duration-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white text-[#1B4D3E] hover:text-[#1B4D3E]/70">Personal</TabsTrigger>
                <TabsTrigger value="history" className="cursor-pointer relative z-10 w-full h-full rounded-full font-semibold text-sm transition-colors duration-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white text-[#1B4D3E] hover:text-[#1B4D3E]/70">History</TabsTrigger>
                <TabsTrigger value="security" className="cursor-pointer relative z-10 w-full h-full rounded-full font-semibold text-sm transition-colors duration-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white text-[#1B4D3E] hover:text-[#1B4D3E]/70">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
                <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-[#1B4D3E]">Personal Information</h2></div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative group size-16">
                    <Avatar className="h-16 w-16 group-hover:opacity-70 transition-opacity">
                      <AvatarImage src={formData.avatar_url || "https://github.com/shadcn.png"} />
                      <AvatarFallback>{formData.first_name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <Label htmlFor="avatar-upload" className="cursor-pointer absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        {avatarLoading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
                        <span className="sr-only">Change Avatar</span>
                    </Label>
                    <input id="avatar-upload" type="file" accept="image/*" onChange={onFileChange} disabled={avatarLoading} className="sr-only"/>
                  </div> 
                  <div>
                    <h3 className="text-xl font-bold text-[#1B4D3E]">{formData.preferred_name || "Loading..."}</h3>
                    <p className="text-sm text-gray-500">{formData.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#1B4D3E] font-semibold">First Name</Label>
                    <Input name="first_name" value={formData.first_name} onChange={handleInputChange} className="bg-[#E8F3E8] border-none shadow-sm cursor-text"/>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#1B4D3E] font-semibold">Last Name</Label>
                    <Input name="last_name" value={formData.last_name} onChange={handleInputChange} className="bg-[#E8F3E8] border-none shadow-sm cursor-text"/>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#1B4D3E] font-semibold">Preferred Name</Label>
                  <Input name="preferred_name" value={formData.preferred_name} onChange={handleInputChange} className="bg-[#E8F3E8] border-none shadow-sm cursor-text"/>
                  <p className="text-xs text-gray-500">This is the name we will call you by.</p>
                </div>

                <Button onClick={handleUpdateProfile} disabled={updating} className="cursor-pointer w-full bg-[#1B4D3E] hover:bg-[#153a2f] py-6 text-base rounded-xl font-bold text-white shadow-md transition-all">
                  {updating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</> : <><Save className="mr-2 h-5 w-5" /> Save Changes</>}
                </Button>
              </TabsContent>

              <TabsContent value="history" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
                <h2 className="text-xl font-bold text-[#1B4D3E] mb-4">Queue History</h2>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {history.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No history yet.</p>
                  ) : (
                    history.map((ticket) => (
                      <div key={ticket.ticket_id} className="bg-[#E8F3E8] p-4 rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-[#1B4D3E]">{ticket.queue_id?.name || 'Unknown Queue'}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${ticket.status === 'completed' ? 'bg-green-100 text-green-700' : ticket.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {ticket.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#1B4D3E]/80">
                          <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(ticket.created_at).toLocaleDateString()}</div>
                          <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="security" className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle className="text-[#1B4D3E] flex items-center gap-2">
                            <Lock className="h-5 w-5" /> Account Security
                        </CardTitle>
                        <CardDescription>Manage your account credentials and critical actions.</CardDescription>
                    </CardHeader>
                    
                    <div className="space-y-4 pt-2 max-w-lg">
                        <h3 className="font-bold text-[#1B4D3E]">Password Settings</h3>
                        <p className="text-sm text-gray-500">Update your password to keep your account secure.</p>
                        <Button 
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="cursor-pointer bg-[#1B4D3E] hover:bg-[#153a2f] flex items-center gap-2"
                        >
                            <KeyRound className="h-4 w-4" /> Change Password
                        </Button>
                    </div>
                    
                    <Separator className="my-6" />
                    <div className="space-y-3">
                        <h3 className="font-bold text-red-600">Danger Zone</h3>
                        <p className="text-sm text-gray-500">Deleting your account is permanent.</p>
                        <Button variant="destructive" disabled className="cursor-not-allowed">Delete Account (Disabled)</Button>
                    </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* --- PASSWORD UPDATE MODAL --- */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="cursor-pointer absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsPasswordModalOpen(false)}></div>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-6 text-center border-b border-gray-100">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F3E8] mb-4">
                        <Lock className="h-6 w-6 text-[#1B4D3E]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label className="text-[#1B4D3E] font-medium">Current Password</Label>
                            <button 
                                onClick={(e) => { e.preventDefault(); setIsForgotConfirmModalOpen(true); }} 
                                className="cursor-pointer text-xs text-[#1B4D3E] font-semibold hover:underline"
                            >
                                Forgot password?
                            </button>
                        </div>
                        <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-gray-50 border-gray-200 cursor-text" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[#1B4D3E] font-medium">New Password (min 8 chars)</Label>
                        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-gray-50 border-gray-200 cursor-text" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[#1B4D3E] font-medium">Confirm New Password</Label>
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-gray-50 border-gray-200 cursor-text" />
                    </div>
                </div>

                <div className="p-4 flex gap-3 bg-gray-50 border-t border-gray-100">
                    <Button onClick={() => setIsPasswordModalOpen(false)} variant="outline" className="cursor-pointer flex-1 font-bold text-gray-600 rounded-xl">Cancel</Button>
                    <Button onClick={handlePasswordSubmit} disabled={passwordLoading} className="cursor-pointer flex-1 font-bold bg-[#1B4D3E] hover:bg-[#153a2f] text-white rounded-xl">
                        {passwordLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update"}
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* --- FORGOT PASSWORD CONFIRMATION MODAL --- */}
      {isForgotConfirmModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="cursor-pointer absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !forgotPasswordLoading && setIsForgotConfirmModalOpen(false)}></div>
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-300">
                  <div className="p-6 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F3E8] mb-4">
                          <Mail className="h-6 w-6 text-[#1B4D3E]" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Send Recovery Email?</h3>
                      <p className="text-sm text-gray-500 mt-2">
                          We will send a secure password reset link to <span className="font-bold text-gray-900">{user?.email}</span>.
                      </p>
                  </div>

                  <div className="p-4 flex gap-3 bg-gray-50 border-t border-gray-100">
                      <Button 
                          onClick={() => setIsForgotConfirmModalOpen(false)} 
                          variant="outline" 
                          className="cursor-pointer flex-1 font-bold text-gray-600 border-gray-200 hover:bg-gray-100"
                          disabled={forgotPasswordLoading}
                      >
                          Cancel
                      </Button>
                      <Button 
                          onClick={handleForgotPassword} 
                          className="cursor-pointer flex-1 font-bold bg-[#1B4D3E] hover:bg-[#153a2f] text-white shadow-md"
                          disabled={forgotPasswordLoading}
                      >
                          {forgotPasswordLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Email"}
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* --- IMAGE CROPPER MODAL --- */}
      {isCropModalOpen && imageSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="cursor-pointer absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsCropModalOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-300">
            <div className="p-4 text-center border-b border-gray-100"><h3 className="text-lg font-bold text-[#1B4D3E]">Position and Size</h3></div>
            <div className="relative w-full h-64 bg-gray-900"><Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom}/></div>
            <div className="p-4 px-6 flex items-center gap-4 bg-gray-50 border-b border-gray-100"><span className="text-sm text-gray-500 font-medium">Zoom</span><input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="cursor-pointer w-full accent-[#1B4D3E]"/></div>
            <div className="p-4 flex gap-3 bg-white">
                <Button onClick={() => setIsCropModalOpen(false)} variant="outline" className="cursor-pointer flex-1 font-bold text-gray-600 rounded-xl">Cancel</Button>
                <Button onClick={handleCropConfirm} className="cursor-pointer flex-1 font-bold bg-[#1B4D3E] hover:bg-[#153a2f] text-white rounded-xl">Save Picture</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}