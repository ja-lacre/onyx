import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ADMIN_PATHS = ['/dashboard', '/queue-management', '/settings', '/admin'];

async function getUserRole(request: NextRequest): Promise<string | null> {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => request.cookies.get(name)?.value,
                set: () => {},
                remove: () => {},
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

    return profile?.role || 'user';
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    const ADMIN_PATHS = ['/dashboard', '/queue-management', '/settings', '/admin'];
    const isAdminPath = ADMIN_PATHS.some(path => pathname.startsWith(path));

    if (isAdminPath) {
        const userRole = await getUserRole(request);
        
        if (userRole !== 'admin') {
            return NextResponse.redirect(new URL('/home', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|login|signup|forgot-password).*)',
    ],
};