import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const legacyCircularMatch = request.nextUrl.pathname.match(
    /^\/(?:category\/)?[a-z0-9-]*dpsa-circular-(\d{1,3})-of-(20\d{2})(?:-[a-z0-9-]+)?\/?$/i,
  );
  if (legacyCircularMatch) {
    const number = Number(legacyCircularMatch[1]);
    if (number >= 1 && number <= 100) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/jobs";
      destination.searchParams.set("q", `DPSA CIRCULAR ${number} of ${legacyCircularMatch[2]}`);
      return NextResponse.redirect(destination, 308);
    }
  }

  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  const { url, key } = getSupabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
