import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const updateSession = async (request: NextRequest) => {
  // If Supabase env vars are missing or invalid, let requests through
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith('http')) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // IMPORTANT: Do NOT remove this line. It refreshes the auth token.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If user is not signed in and the current path is not /login,
    // redirect the user to /login
    if (
      !user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/auth') &&
      !request.nextUrl.pathname.startsWith('/api/employee')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (e) {
    // Supabase is unreachable (paused, network issue, etc.)
    // Let the request through — the client-side app works offline from IndexedDB
    console.warn('Supabase unreachable in middleware, allowing request through:', e);
    return NextResponse.next({ request: { headers: request.headers } });
  }
};
