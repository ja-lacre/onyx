import Link from "next/link";
import Image from "next/image";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserTopbar() {
  return (
    <header className="max-w-2xl mx-auto flex items-center justify-between mb-8">
      {}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 relative">
          <Image
            src="/logos/queuely_logo.svg"
            alt="Queuely Logo"
            fill
            className="object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold text-[#1B4D3E]">Queuely</h1>
      </div>

      {}
      <div className="flex items-center gap-2">
        <Link href="/profile">
          <Button
            variant="ghost"
            size="icon"
            className="text-[#1B4D3E] hover:bg-[#1B4D3E]/10"
          >
            <User className="h-6 w-6" />
            <span className="sr-only">Profile</span>
          </Button>
        </Link>
        {}
        <Button
          variant="ghost"
          size="icon"
          className="text-[#1B4D3E] hover:bg-[#1B4D3E]/10"
        >
          <LogOut className="h-6 w-6" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  );
}
