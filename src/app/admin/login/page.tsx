import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin-login-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Admin sign in" };
export const instant = false;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; setup?: string }>;
}) {
  const { error, setup } = await searchParams;
  return <AdminLoginForm configured={isSupabaseConfigured()} showNotAdmin={error === "not-admin"} showSetup={setup === "missing"} />;
}
