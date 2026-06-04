// src/app/(user)/layout.tsx
import { UserTopbar } from "@/components/user/topbar";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#E8F3E8] p-4 md:p-8">
      {/* Because the Topbar is here in the layout, it will NEVER unmount or 
        flicker when moving between /home and /profile! 
      */}
      <UserTopbar />
      
      {/* The individual pages and loading screens will swap out right here */}
      {children}
    </div>
  );
}