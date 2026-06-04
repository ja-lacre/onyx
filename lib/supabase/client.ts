// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // 30 minutes * 60 seconds = 1800 seconds
        maxAge: 30 * 60, 
        path: '/',
        sameSite: 'lax',
        // This ensures the cookie works securely
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );
}