import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export function isAdminLoginProtectionConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function isAdminLoginLocked(email: string): Promise<boolean | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc("is_admin_login_locked", {
      p_email: email,
    });
    if (error) {
      console.error("Could not check the admin login lockout state.", error.code);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Could not check the admin login lockout state.", error);
    return null;
  }
}

export async function recordAdminLoginFailure(email: string): Promise<number | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc("record_admin_login_failure", {
      p_email: email,
    });
    if (error) {
      console.error("Could not record an admin login failure.", error.code);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Could not record an admin login failure.", error);
    return null;
  }
}

export async function clearAdminLoginFailures(email: string): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.rpc("clear_admin_login_failures", {
      p_email: email,
    });
    if (error) {
      console.error("Could not clear admin login failures.", error.code);
      return false;
    }
    return data;
  } catch (error) {
    console.error("Could not clear admin login failures.", error);
    return false;
  }
}
