"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, CalendarDays, Users, Megaphone,
  Globe, LogOut, ShieldAlert, ChevronLeft, User,
} from "lucide-react";

const adminNav = [
  { href: "/admin",            label: "Overview",   Icon: LayoutDashboard, exact: true },
  { href: "/admin/events",     label: "Events",     Icon: CalendarDays },
  { href: "/admin/organisers", label: "Organisers", Icon: Users },
  { href: "/admin/ads",        label: "Ad Slots",   Icon: Megaphone },
];

interface AdminSidebarProps { adminName: string }

export function AdminSidebar({ adminName }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function isActive(item: (typeof adminNav)[0]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-[#2A2A30] bg-[#111113] flex-col sticky top-0 h-screen z-20">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-[#2A2A30]">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight"><span className="text-[#FF6A3D]">parchi</span><span className="text-white">.pk</span></span>
            <span className="text-[10px] text-[#EF4444] font-bold bg-[#EF4444]/10 border border-[#EF4444]/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              admin
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {adminNav.map((item) => {
            const active = isActive(item);
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active ? "bg-[#FF6A3D]/10 text-[#FF6A3D]" : "text-[#6B7280] hover:text-[#FAFAFA] hover:bg-[#1A1A1E]"
                )}
              >
                <item.Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}

          <div className="my-2 border-t border-[#2A2A30]" />

          <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#6B7280] hover:text-[#FAFAFA] hover:bg-[#1A1A1E] transition-colors">
            <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={2} />
            Back to Profile
          </Link>
        </nav>

        {/* Footer */}
        <div className="p-2.5 border-t border-[#2A2A30] space-y-0.5">
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#EF4444]/10 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444]" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[#FAFAFA] text-xs font-semibold truncate">{adminName}</p>
              <p className="text-[#6B7280] text-[11px]">Administrator</p>
            </div>
          </div>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#6B7280] hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors">
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#111113] border-t border-[#2A2A30] z-40 md:hidden">
        <div className="flex items-stretch justify-around h-16">
          {adminNav.map((item) => {
            const active = isActive(item);
            return (
              <Link key={item.href} href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative">
                {active && <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF6A3D]" />}
                <item.Icon
                  className={cn("w-5 h-5 transition-all", active ? "text-[#FF6A3D]" : "text-[#6B7280]")}
                  strokeWidth={active ? 2.2 : 1.6}
                />
                <span className={cn("text-[10px] font-medium", active ? "text-[#FF6A3D]" : "text-[#6B7280]")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          {/* Back to profile on mobile */}
          <Link href="/profile" className="flex-1 flex flex-col items-center justify-center gap-1 py-2">
            <User className="w-5 h-5 text-[#6B7280]" strokeWidth={1.6} />
            <span className="text-[10px] font-medium text-[#6B7280]">Profile</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
