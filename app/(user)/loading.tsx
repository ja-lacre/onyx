// src/app/(user)/loading.tsx
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export default function UserLoading() {
  return (
    <main className="max-w-md w-full mx-auto space-y-6 relative animate-in fade-in duration-300">
      
      {/* Title/Greeting Placeholder */}
      <div className="space-y-2 animate-pulse mt-2">
          <div className="h-7 w-48 bg-[#1B4D3E]/20 rounded-md"></div>
          <div className="h-4 w-32 bg-[#1B4D3E]/10 rounded-md"></div>
      </div>
      
      {/* Pulsing Skeleton Card */}
      <Card className="bg-white border-none shadow-lg overflow-hidden rounded-2xl text-center p-8 space-y-6 animate-pulse">
        <CardContent className="p-0 space-y-6 flex flex-col items-center">
          {/* Visual Icon Placeholder */}
          <div className="h-24 w-24 bg-[#E8F3E8] rounded-full"></div>
          
          {/* Text Line Placeholders */}
          <div className="space-y-3 w-full flex flex-col items-center">
              <div className="h-8 w-48 bg-gray-200 rounded-md"></div>
              <div className="h-4 w-64 bg-gray-100 rounded-md"></div>
              <div className="h-4 w-52 bg-gray-100 rounded-md"></div>
          </div>
        </CardContent>
        
        <CardFooter className="p-0 pt-4 w-full">
          {/* Large Button Placeholder */}
          <div className="w-full h-16 bg-[#1B4D3E]/20 rounded-xl"></div>
        </CardFooter>
      </Card>
      
    </main>
  );
}