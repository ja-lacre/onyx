import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Play, Pause, SkipForward } from "lucide-react";

const queueData = [
  {
    ticket: "40",
    customer: "Customer",
    waitTime: "1 mins",
    priority: true,
    status: "Serving",
  },
  {
    ticket: "12",
    customer: "Customer",
    waitTime: "3 mins",
    priority: false,
    status: "Waiting",
  },
  {
    ticket: "13",
    customer: "Customer",
    waitTime: "12 mins",
    priority: false,
    status: "Waiting",
  },
  {
    ticket: "18",
    customer: "Customer",
    waitTime: "30 mins",
    priority: false,
    status: "Waiting",
  },
  {
    ticket: "21",
    customer: "Customer",
    waitTime: "32 mins",
    priority: false,
    status: "Waiting",
  },
];

export default function QueueManagementPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1B4D3E]">Queue Management</h1>
        <p className="text-gray-500">
          Monitor and manage customer queues in real-time
        </p>
      </div>

      {}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <span className="font-medium">Queue Controls</span>
          <Button className="bg-[#1B4D3E] hover:bg-[#153a2f]">
            <Play className="mr-2 h-4 w-4" /> Start Service
          </Button>
          <Button variant="outline" className="text-[#1B4D3E] border-[#1B4D3E]">
            <Pause className="mr-2 h-4 w-4" /> Pause Queue
          </Button>
          <Button className="bg-[#1B4D3E] hover:bg-[#153a2f]">
            <SkipForward className="mr-2 h-4 w-4" /> Call Next
          </Button>
        </div>
      </Card>

      {}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Serving</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-[#1B4D3E] text-center">
              40
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Next in Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-[#1B4D3E] text-center">
              43
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Previously Served
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-[#1B4D3E] text-center">
              39
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <Card>
        <CardHeader>
          <CardTitle>Current Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Wait Time</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queueData.map((item) => (
                <TableRow key={item.ticket}>
                  <TableCell className="font-medium">{item.ticket}</TableCell>
                  <TableCell>{item.customer}</TableCell>
                  <TableCell>{item.waitTime}</TableCell>
                  <TableCell>
                    {item.priority ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                        Yes
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        No
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        item.status === "Serving"
                          ? "bg-green-100 text-green-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      {item.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Footer Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-[#1B4D3E]">34</div>
          <div className="text-sm text-gray-500">Waiting</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-[#1B4D3E]">5</div>
          <div className="text-sm text-gray-500">Called</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-[#1B4D3E]">34</div>
          <div className="text-sm text-gray-500">Completed Today</div>
        </Card>
      </div>
    </div>
  );
}
