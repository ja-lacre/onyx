// /src/middleware.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr'; // This function should now be recognized

// Define admin paths (Keep this list accurate)
const ADMIN_PATHS = ['/dashboard', '/queue-management', '/settings', '/admin-profile'];


// The core logic to fetch the role, simplified for reliability
async function getUserRole(request: NextRequest): Promise<string | null> {
    // Client configuration using cookies from the request
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => request.cookies.get(name)?.value,
                // These are no-ops in this specific helper function
                set: () => {}, 
                remove: () => {},
            },
        }
    );

    // Get the actual user object (which contains the ID)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null; // Not authenticated
    }

    // Fetch the role using the secure user ID
    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

    return profile?.role || 'user';
}


export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // 1. Define the response object, which will be mutated by cookie operations
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // 2. Setup client to handle cookies in the request (get) and response (set/remove)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => request.cookies.get(name)?.value,
                // CRUCIAL: Set/remove operations apply changes directly to the response headers
                set: (name: string, value: string, options: any) => {
                    response.cookies.set({ name, value, ...options });
                },
                remove: (name: string, options: any) => {
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // 3. Refresh the session. This reads the incoming cookie and writes the fresh session 
    // and cookie updates (if any) directly to the `response` object's cookies store (Step 2).
    await supabase.auth.getSession();
    
    
    // 4. Handle authorization if accessing an Admin route
    const isAdminPath = ADMIN_PATHS.some(path => pathname.startsWith(path));

    if (isAdminPath) {
        
        // Use getUser() to ensure the session is valid
        const { data: { user } } = await supabase.auth.getUser();

        // If unauthenticated, redirect to login
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const userRole = await getUserRole(request);
        
        // If authenticated but wrong role, redirect to user home
        if (userRole !== 'admin') {
            console.warn(`Unauthorized access attempt to ${pathname} by role: ${userRole}`);
            return NextResponse.redirect(new URL('/home', request.url));
        }
    }
    
    // 5. Return the response, which now contains the updated session cookies
    return response; 
}

export const config = {
    // Ensure that login and signup pages are EXCLUDED from the middleware checks
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|login|signup|forgot-password).*)',
    ],
};