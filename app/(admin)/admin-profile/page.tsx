// src/app/(admin)/admin-profile/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Save, Loader2, Lock, Camera, KeyRound, Mail } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "sonner";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/utils/cropImage";
import { cn } from "@/lib/utils";

interface AdminFormData {
    first_name: string;
    last_name: string;
    preferred_name: string;
    email: string;
    avatar_url: string;
}

const getInitials = (firstName: string, lastName: string, preferredName: string) => {
    if (preferredName) return preferredName.split(/\s+/).map(n => n[0]).join('').toUpperCase().substring(0, 2);
    if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    return "AD"; 
};

export default function AdminProfilePage() {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    
    const [activeTab, setActiveTab] = useState("personal");

    const [updating, setUpdating] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- PASSWORD MODAL STATES ---
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);

    // --- NEW: FORGOT PASSWORD STATES ---
    const [isForgotConfirmModalOpen, setIsForgotConfirmModalOpen] = useState(false);
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

    // --- CROPPER STATE ---
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const [formData, setFormData] = useState<AdminFormData>({
        first_name: "", last_name: "", preferred_name: "", email: "Loading...", avatar_url: ""
    });

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                router.push("/");
                return;
            }
            setUser(authUser);

            const { data: profile } = await supabase
                .from("users")
                .select("first_name, last_name, preferred_name, avatar_url")
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
            } else {
                setFormData(prev => ({ ...prev, email: authUser.email || "N/A" }));
            }
            setIsLoading(false);
        };
        fetchData();
    }, [supabase, router]);

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
            toast.error("Failed to update profile. Check RLS policies.");
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

    // ✨ UPDATED: Now utilizes the loading state so double-clicks are blocked
    const handleForgotPassword = async () => {
        if (!user?.email) return;
        setForgotPasswordLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            toast.success("A password reset link has been sent to your email.");
            
            // Close both modals on success
            setIsForgotConfirmModalOpen(false);
            setIsPasswordModalOpen(false);
        } catch (error: any) {
            toast.error("Failed to send reset email.");
        } finally {
            setForgotPasswordLoading(false);
        }
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

            const file = new File([croppedImageBlob], "admin_avatar.jpeg", { type: "image/jpeg" });
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (isLoading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#1B4D3E]" /></div>;

    const initials = getInitials(formData.first_name, formData.last_name, formData.preferred_name);

    return (
        <div className="space-y-6 p-0 relative">
            <div>
                <h1 className="text-3xl font-bold text-[#1B4D3E]">Admin Profile</h1>
                <p className="text-gray-500">Manage your personal information and account security settings</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                
                <TabsList className="relative grid grid-cols-2 w-full md:w-[400px] bg-[#E8F3E8] mb-6 rounded-full p-1 h-12">
                    <div 
                        className={cn(
                            "absolute top-1 bottom-1 bg-[#1B4D3E] rounded-full transition-all duration-300 ease-out shadow-sm",
                            activeTab === "personal" ? "left-1 right-[calc(50%+2px)]" : "left-[calc(50%+2px)] right-1"
                        )}
                    />
                    <TabsTrigger value="personal" className="cursor-pointer relative z-10 w-full h-full rounded-full font-semibold text-sm transition-colors duration-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white text-[#1B4D3E] hover:text-[#1B4D3E]/70">Personal</TabsTrigger>
                    <TabsTrigger value="security" className="cursor-pointer relative z-10 w-full h-full rounded-full font-semibold text-sm transition-colors duration-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white text-[#1B4D3E] hover:text-[#1B4D3E]/70">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
                    <Card>
                        <CardContent className="space-y-6 pt-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative group size-16">
                                    <Avatar className="h-16 w-16 group-hover:opacity-70 transition-opacity">
                                        <AvatarImage src={formData.avatar_url || "https://github.com/shadcn.png"} />
                                        <AvatarFallback>{initials}</AvatarFallback>
                                    </Avatar>
                                    <Label htmlFor="admin-avatar-upload" className="cursor-pointer absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        {avatarLoading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
                                        <span className="sr-only">Change Avatar</span>
                                    </Label>
                                    <input id="admin-avatar-upload" type="file" accept="image/*" onChange={onFileChange} disabled={avatarLoading} className="sr-only"/>
                                </div> 
                                <div>
                                    <h3 className="text-xl font-bold text-[#1B4D3E]">{formData.preferred_name || "Admin User"}</h3>
                                    <p className="text-sm text-gray-500">{formData.email}</p>
                                </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg">
                                <div className="space-y-2">
                                    <Label className="text-[#1B4D3E] font-semibold">First Name</Label>
                                    <Input name="first_name" value={formData.first_name} onChange={handleInputChange} className="bg-[#E8F3E8] border-none shadow-sm cursor-text"/>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[#1B4D3E] font-semibold">Last Name</Label>
                                    <Input name="last_name" value={formData.last_name} onChange={handleInputChange} className="bg-[#E8F3E8] border-none shadow-sm cursor-text"/>
                                </div>
                            </div>
                            
                            <div className="space-y-2 max-w-lg">
                                <Label className="text-[#1B4D3E] font-semibold">Preferred Name</Label>
                                <Input name="preferred_name" value={formData.preferred_name} onChange={handleInputChange} className="bg-[#E8F3E8] border-none shadow-sm cursor-text"/>
                                <p className="text-xs text-gray-500">This is the name we will call you by.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="p-6 pt-0">
                            <Button onClick={handleUpdateProfile} disabled={updating} className="cursor-pointer bg-[#1B4D3E] hover:bg-[#153a2f]">
                                {updating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-[#1B4D3E] flex items-center gap-2">
                                <Lock className="h-5 w-5" /> Account Security
                            </CardTitle>
                            <CardDescription>Manage your account credentials and critical actions.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            <div className="space-y-3 pt-2">
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
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

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
                                    
                                    {/* ✨ UPDATED: Triggers the new Confirmation Popup */}
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

            {/* ✨ NEW: FORGOT PASSWORD CONFIRMATION MODAL */}
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
                            <Button onClick={() => setIsCropModalOpen(false)} variant="outline" className="cursor-pointer flex-1 font-bold text-gray-600">Cancel</Button>
                            <Button onClick={handleCropConfirm} className="cursor-pointer flex-1 font-bold bg-[#1B4D3E] hover:bg-[#153a2f] text-white">Save Picture</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}