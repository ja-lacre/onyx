import { CircleCheck } from "lucide-react";

export function Topbar() {
  return (
    <header className="bg-[#5CB85C] text-white p-4 flex justify-end items-center shadow-md">
      {/* Page Title & Description (Not in this topbar per design, but good to have a place) */}
      {/* <div className="flex-1">
        <h1 className="text-xl font-semibold">Dashboard Overview</h1>
        <p className="text-sm">Monitor your queuing system performance and statistics</p>
      </div> */}

      {}
      <div className="flex items-center space-x-2 text-sm font-medium">
        <CircleCheck className="h-4 w-4" />
        <span>System Online</span>
      </div>
    </header>
  );
}
