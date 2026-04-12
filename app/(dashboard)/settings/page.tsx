import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {}
      <div>
        <h1 className="text-3xl font-bold text-[#1B4D3E]">Systems Settings</h1>
        <p className="text-gray-500">
          Configure your queuing system preferences and operations
        </p>
      </div>

      {}
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

        {}
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
                  id="company-name"
                  placeholder="Enter company name"
                  className="bg-[#E8F3E8] border-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="working-hours">Working Hours</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="working-hours-start"
                    placeholder="09:00 AM"
                    className="bg-[#E8F3E8] border-none"
                  />
                  <Input
                    id="working-hours-end"
                    placeholder="05:00 PM"
                    className="bg-[#E8F3E8] border-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-[#E8F3E8] border-none">
                <div className="space-y-0.5">
                  <Label className="text-base">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable the queuing system for maintenance.
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-[#1B4D3E] hover:bg-[#153a2f]">
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Queue Config Tab Content */}
        <TabsContent value="queue-config">
          <Card>
            <CardHeader>
              <CardTitle>Queue Configuration</CardTitle>
              <CardDescription>Adjust how your queues operate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="max-queue">Maximum Queue Length</Label>
                  <Input
                    id="max-queue"
                    placeholder="e.g., 100"
                    className="bg-[#E8F3E8] border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avg-service">
                    Average Service Time (minutes)
                  </Label>
                  <Input
                    id="avg-service"
                    placeholder="e.g., 15"
                    className="bg-[#E8F3E8] border-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-advance Queue</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically call the next customer when a service is
                      completed.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Priority Support</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow specific tickets to be prioritized in the queue.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send text messages to customers when it's their turn.
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-[#1B4D3E] hover:bg-[#153a2f]">
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
