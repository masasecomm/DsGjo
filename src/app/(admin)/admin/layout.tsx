import Link from "next/link";
import { connection } from "next/server";
import { signOut } from "@/app/actions";
import { AdminSidebar } from "@/components/admin-sidebar";
import { requireAdmin } from "@/lib/admin";

export const instant = false;

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  await requireAdmin();

  return (
    <div className="admin-wrap">
      <header className="admin-topbar">
        <Link href="/" className="brand"><span className="brand-mark">D</span><span className="brand-name">DPSA<span>JOBS</span></span></Link>
        <form action={signOut}><button type="submit">Sign out</button></form>
      </header>
      <div className="admin-layout">
        <AdminSidebar active="" />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
