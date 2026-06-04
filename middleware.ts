// src/middleware.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr'; 

// 1. Define your route categories
const ADMIN_PATHS = ['/dashboard', '/queue-management', '/settings', '/admin-profile'];
const PROTECTED_PATHS = ['/home', '/profile', ...ADMIN_PATHS]; 
const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    let response = NextResponse.next({
        request: { headers: request.headers },
    });

    // 2. Setup Supabase client and enforce the 30-minute maxAge on ALL requests
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => request.cookies.get(name)?.value,
                set: (name: string, value: string, options: any) => {
                    response.cookies.set({ 
                        name, 
                        value, 
                        ...options, 
                        maxAge: 30 * 60 // 30 Minutes
                    });
                },
                remove: (name: string, options: any) => {
                    response.cookies.set({ 
                        name, 
                        value: '', 
                        ...options, 
                        maxAge: 0 
                    });
                },
            },
        }
    );

    // 3. Get the current user session securely
    const { data: { user } } = await supabase.auth.getUser();

    // ---------------------------------------------------------
    // TRAFFIC CONTROL LOGIC
    // ---------------------------------------------------------

    // A. Handle the Root Path ('/')
    if (pathname === '/') {
        return NextResponse.redirect(new URL(user ? '/home' : '/login', request.url));
    }

    // B. Handle Auth Paths (Login/Signup)
    // If they are already logged in, don't let them see the login screen!
    if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
        if (user) {
            return NextResponse.redirect(new URL('/home', request.url));
        }
        return response; // Let them stay on the login page if not authenticated
    }

    // C. Handle Protected Paths (Home, Profile, etc.)
    // If they are NOT logged in, kick them to the login screen
    const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path));
    if (isProtectedPath && !user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // D. Handle Admin-Only Paths
    const isAdminPath = ADMIN_PATHS.some(path => pathname.startsWith(path));
    if (isAdminPath && user) {
        // Fetch the role
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
        
        // If they aren't an admin, kick them back to the user home
        if (profile?.role !== 'admin') {
            console.warn(`Unauthorized admin access attempt by user: ${user.id}`);
            return NextResponse.redirect(new URL('/home', request.url));
        }
    }
    
    return response; 
}

export const config = {
    // ✨ CRITICAL CHANGE: We removed the negative lookaheads for login/signup
    // so the middleware can actively intercept those pages too!
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|logos).*)',
    ],
};