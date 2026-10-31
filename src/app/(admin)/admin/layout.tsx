import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { signOut } from "@/app/actions";
import { AdminSidebar } from "@/components/admin-sidebar";
import { requireAdmin } from "@/lib/admin";

export const instant = false;

async function AdminLayoutContent({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  await requireAdmin();

  return (
    <div className="admin-wrap">
      <header className="admin-topbar">
        <Link href="/" className="brand" aria-label="DPSA Government Jobs home"><span className="brand-mark" aria-hidden="true" /><span className="brand-name">DPSA Government Jobs</span></Link>
        <form action={signOut}><button type="submit">Sign out</button></form>
      </header>
      <div className="admin-layout">
        <AdminSidebar active="" />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div className="admin-wrap"><p className="admin-empty">Loading admin...</p></div>}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
