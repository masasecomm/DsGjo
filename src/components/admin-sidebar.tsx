"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/subscribers", label: "Job alert subscribers" },
];

export function AdminSidebar({ active }: { active: string }) {
  const pathname = usePathname();
  return (
    <aside className="admin-sidebar">
      <span>MANAGE YOUR SITE</span>
      {items.map((item) => {
        const selected = active === item.href || pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
        return <Link className={selected ? "active" : ""} href={item.href} key={item.href}>{item.label}</Link>;
      })}
    </aside>
  );
}
