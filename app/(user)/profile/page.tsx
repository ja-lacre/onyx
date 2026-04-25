"use client";

import Link from "next/link";
import { ArrowLeft, Edit, Calendar, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const historyData = [
  { location: "Canteen", date: "1/10/2025", wait: "5 min wait" },
  { location: "Infirmary", date: "1/10/2025", wait: "5 min wait" },
  { location: "Registrar Canteen", date: "1/10/2025", wait: "5 min wait" },
];

export default function UserProfilePage() {
  return (
    <div className="min-h-screen bg-[#E8F3E8] p-4 md:p-8">
      {}
      <header className="max-w-2xl mx-auto flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#1B4D3E]">Profile</h1>
        <Link href="/home">
          <Button variant="ghost" size="icon" className="text-[#1B4D3E]">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
      </header>

      {}
      <main className="max-w-md mx-auto">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <Tabs defaultValue="personal" className="w-full">
              {}
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

              {}
              <TabsContent value="personal" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#1B4D3E]">
                    Personal Information
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#1B4D3E] border-[#1B4D3E] gap-2"
                  >
                    <Edit className="h-4 w-4" /> Edit
                  </Button>
                </div>

                {}
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src="https://github.com/shadcn.png"
                      alt="Ricky"
                    />
                    <AvatarFallback>RI</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-[#1B4D3E]">Ricky</h3>
                    <p className="text-sm text-gray-500">
                      bigmommyfluer@gmail.com
                    </p>
                  </div>
                </div>

                {}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#1B4D3E] font-semibold">
                      First Name
                    </Label>
                    <div className="bg-[#E8F3E8] p-3 rounded-lg text-[#1B4D3E]">
                      Ricky
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#1B4D3E] font-semibold">
                      Last Name
                    </Label>
                    <div className="bg-[#E8F3E8] p-3 rounded-lg text-[#1B4D3E]">
                      Wenigetu
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1B4D3E] font-semibold">
                    Preferred Name
                  </Label>
                  <div className="bg-[#E8F3E8] p-3 rounded-lg text-[#1B4D3E]">
                    Ricky
                  </div>
                </div>
              </TabsContent>

              {}
              <TabsContent value="history" className="space-y-6">
                <h2 className="text-xl font-bold text-[#1B4D3E] mb-4">
                  Queue History
                </h2>
                <div className="space-y-3">
                  {historyData.map((item, index) => (
                    <div
                      key={index}
                      className="bg-[#E8F3E8] p-4 rounded-xl space-y-2"
                    >
                      <h3 className="font-bold text-[#1B4D3E]">
                        {item.location}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-[#1B4D3E]/80">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" /> {item.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" /> {item.wait}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {}
              <TabsContent value="security" className="space-y-6">
                <h2 className="text-xl font-bold text-[#1B4D3E] mb-4">
                  Security
                </h2>

                {}
                <div className="space-y-3">
                  <h3 className="font-bold text-[#1B4D3E]">Change Password</h3>
                  <p className="text-sm text-gray-500">
                    Update your password to keep your account secure.
                  </p>
                  <Button
                    variant="outline"
                    className="text-[#1B4D3E] border-[#1B4D3E]"
                  >
                    Change Password
                  </Button>
                </div>
                <Separator className="my-6" />
                {}
                <div className="space-y-3">
                  <h3 className="font-bold text-red-600">Delete Account</h3>
                  <p className="text-sm text-gray-500">
                    Permanently delete your account and all associated data.
                  </p>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
