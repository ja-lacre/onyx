// src/app/(admin)/profile/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Save, Loader2, Lock, Camera } from "lucide-react"; // ADDED Camera Icon

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface AdminFormData {
    first_name: string;
    last_name: string;
    preferred_name: string;
    email: string;
    avatar_url: string;
}

// --- HELPER FUNCTION TO GET INITIALS ---
const getInitials = (firstName: string, lastName: string, preferredName: string) => {
    // 1. Prioritize Preferred Name if available
    if (preferredName) {
        return preferredName.split(/\s+/).map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    // 2. Fallback to First and Last Name
    if (firstName && lastName) {
        return (firstName[0] + lastName[0]).toUpperCase();
    }
    // 3. Fallback to just First Name
    if (firstName) {
        return firstName[0].toUpperCase();
    }
    // 4. Default
    return "AD"; 
};


export default function AdminProfilePage() {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    
    const [updating, setUpdating] = useState(false);
    // NEW: State for avatar upload loading
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [formData, setFormData] = useState<AdminFormData>({
        first_name: "",
        last_name: "",
        preferred_name: "",
        email: "Loading...",
        avatar_url: ""
    });

    // --- FETCH DATA ON LOAD ---
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

    // --- UPDATE PROFILE FUNCTION ---
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
    
    // --- NEW: AVATAR UPLOAD LOGIC ---
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!user) {
                alert("User not authenticated.");
                return;
            }
            
            const file = event.target.files?.[0];
            if (!file) return;

            setAvatarLoading(true);
            
            const fileExt = file.name.split('.').pop();
            // Use the user's ID as a folder name for RLS and unique naming
            const fileName = `${user.id}/${Date.now()}.${fileExt}`; 

            // 1. Upload file to Supabase Storage (Assumes a bucket named 'avatars')
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // 2. Get the public URL
            const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);
                
            const newAvatarUrl = publicUrlData.publicUrl;

            // 3. Update the database with the new avatar URL
            const { error: updateError } = await supabase
                .from("users")
                .update({ avatar_url: newAvatarUrl })
                .eq("user_id", user.id);
                
            if (updateError) throw updateError;
            
            // 4. Update local state
            setFormData(prev => ({ ...prev, avatar_url: newAvatarUrl }));

            alert("Profile picture updated successfully!");

        } catch (error: any) {
            console.error("Error uploading avatar:", error.message || error);
            alert("Failed to upload avatar. Check console/storage policies.");
        } finally {
            setAvatarLoading(false);
            // Reset file input to allow uploading the same file again if needed
            if (event.target) event.target.value = ''; 
        }
    };
    // -----------------------------


    // --- HELPER: Handle Input Changes (Moved to correct scope) ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- RENDER BLOCKING (Moved to correct scope)
    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#1B4D3E]" />
            </div>
        );
    }

    const initials = getInitials(formData.first_name, formData.last_name, formData.preferred_name);

    return (
        <div className="space-y-6 p-0">
            <div>
                <h1 className="text-3xl font-bold text-[#1B4D3E]">Admin Profile</h1>
                <p className="text-gray-500">
                    Manage your personal information and account security settings
                </p>
            </div>

            <Tabs defaultValue="personal" className="w-full">
                {/* Tabs List (Narrowed like the Settings page example) */}
                <TabsList className="grid w-full grid-cols-2 md:w-[400px] bg-[#E8F3E8]">
                    <TabsTrigger
                        value="personal"
                        className="data-[state=active]:bg-[#1B4D3E] data-[state=active]:text-white"
                    >
                        Personal
                    </TabsTrigger>
                    <TabsTrigger
                        value="security"
                        className="data-[state=active]:bg-[#1B4D3E] data-[state=active]:text-white"
                    >
                        Security
                    </TabsTrigger>
                </TabsList>

                {/* ================= PERSONAL TAB (Profile Edit) ================= */}
                <TabsContent value="personal">
                    <Card>
                        <CardContent className="space-y-6">
                            {/* Profile Header Section (MODIFIED FOR AVATAR UPLOAD) */}
                            <div className="flex items-center gap-4 mb-6">
                                {/* Avatar Upload Container */}
                                <div className="relative group size-16">
                                    <Avatar className="h-16 w-16 group-hover:opacity-70 transition-opacity">
                                        <AvatarImage src={formData.avatar_url || "https://github.com/shadcn.png"} />
                                        <AvatarFallback>{initials}</AvatarFallback>
                                    </Avatar>
                                    
                                    {/* The Hidden File Input and Overlay Button */}
                                    <Label 
                                        htmlFor="admin-avatar-upload"
                                        className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                                    >
                                        {avatarLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                                        ) : (
                                        <Camera className="h-5 w-5 text-white" />
                                        )}
                                        <span className="sr-only">Change Avatar</span>
                                    </Label>

                                    <input
                                        id="admin-avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        disabled={avatarLoading}
                                        className="sr-only"
                                    />
                                </div> 
                                {/* End Avatar Upload Container */}
                                
                                <div>
                                    <h3 className="text-xl font-bold text-[#1B4D3E]">
                                        {formData.preferred_name || "Admin User"}
                                    </h3>
                                    <p className="text-sm text-gray-500">{formData.email}</p>
                                </div>
                            </div>
                            
                            <Separator />
                            
                            {/* Form Fields: 2-column layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg">
                                <div className="space-y-2">
                                    <Label className="text-[#1B4D3E] font-semibold">First Name</Label>
                                    <Input
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleInputChange}
                                        className="bg-[#E8F3E8] border-[#1B4D3E]/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[#1B4D3E] font-semibold">Last Name</Label>
                                    <Input
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleInputChange}
                                        className="bg-[#E8F3E8] border-[#1B4D3E]/20"
                                    />
                                </div>
                            </div>
                            
                            {/* Preferred Name Section (Full width) */}
                            <div className="space-y-2 max-w-lg">
                                <Label className="text-[#1B4D3E] font-semibold">Preferred Name</Label>
                                <Input
                                    name="preferred_name"
                                    value={formData.preferred_name}
                                    onChange={handleInputChange}
                                    className="bg-[#E8F3E8] border-[#1B4D3E]/20"
                                />
                                <p className="text-xs text-gray-500">This is the name we will call you by.</p>
                            </div>
                            
                            {/* Save Button: Separated into CardFooter */}
                        </CardContent>
                        <CardFooter className="p-6 pt-0">
                            <Button
                                onClick={handleUpdateProfile}
                                disabled={updating}
                                className="bg-[#1B4D3E] hover:bg-[#153a2f]"
                            >
                                {updating ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                                ) : (
                                    <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                    {/* ================= SECURITY TAB ================= */}
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-[#1B4D3E] flex items-center gap-2">
                                <Lock className="h-5 w-5" /> Account Security
                            </CardTitle>
                            <CardDescription>
                                Manage your account credentials and critical actions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Change Password Section */}
                            <div className="space-y-3 pt-2">
                                <h3 className="font-bold text-[#1B4D3E]">Change Password</h3>
                                <p className="text-sm text-gray-500">
                                    You must use the Supabase Auth system to securely change your password.
                                </p>
                                <Button variant="outline" className="text-[#1B4D3E] border-[#1B4D3E]" disabled>
                                    Change Password (External)
                                </Button>
                            </div>

                            <Separator className="my-6" />
                            
                            {/* Danger Zone Section */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-red-600">Danger Zone</h3>
                                <p className="text-sm text-gray-500">
                                    Deleting your account is permanent.
                                </p>
                                <Button variant="destructive" disabled>
                                    Delete Account (Disabled)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}