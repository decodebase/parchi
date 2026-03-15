"use client";

/**
 * components/layout/DesktopLayout.tsx
 *
 * Shared layout for organiser dashboard.
 * - Desktop (md+): Fixed left sidebar, sticky header, scrollable main
 * - Mobile (<md):  Full-screen header + scrollable main + fixed bottom nav bar
 *
 * Pattern mirrors the Firebase reference project's approach.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, CalendarDays, ScanLine, Megaphone,
  ChevronLeft, LogOut, type LucideIcon,
} from "lucide-react";

type IconComp = LucideIcon;

interface DesktopLayoutProps {
  children: React.ReactNode;
  navItems?: NavItem[];
  sectionLabel?: string;
}

interface NavItem {
  href: string;
  label: string;
  Icon: IconComp;
  exact?: boolean;
}

const dashboardNav: NavItem[] = [
  { href: "/dashboard",         label: "Overview", Icon: LayoutDashboard, exact: true },
  { href: "/dashboard/events",  label: "Events",   Icon: CalendarDays },
  { href: "/dashboard/scanner", label: "Scanner",  Icon: ScanLine },
  { href: "/dashboard/promote", label: "Promote",  Icon: Megaphone },
];

export function DesktopLayout({
  children,
  navItems = dashboardNav,
  sectionLabel = "dashboard",
}: DesktopLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function isActive(item: NavItem) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <div className="min-h-[100svh] bg-[#0A0A0B] flex pb-16 md:pb-0">

      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-[#2A2A30] bg-[#111113] flex-col sticky top-0 h-screen z-20">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-[#2A2A30]">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight"><span className="text-[#FF6A3D]">parchi</span><span className="text-white">.pk</span></span>
            <span className="text-[10px] text-[#6B7280] font-medium bg-[#1A1A1E] px-1.5 py-0.5 rounded-full border border-[#2A2A30]">
              {sectionLabel}
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {navItems.map((item) => {
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
        </nav>

        {/* Bottom */}
        <div className="p-2.5 border-t border-[#2A2A30] space-y-0.5">
          <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#6B7280] hover:text-[#FAFAFA] hover:bg-[#1A1A1E] transition-colors">
            <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={2} />
            Back to Profile
          </Link>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#6B7280] hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors">
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Sticky top bar */}
        <header className="h-14 border-b border-[#2A2A30] bg-[#111113]/90 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          {/* Mobile: logo + section label */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-lg font-black"><span className="text-[#FF6A3D]">parchi</span><span className="text-white">.pk</span></span>
            <span className="text-[10px] text-[#6B7280] font-medium bg-[#1A1A1E] px-1.5 py-0.5 rounded-full border border-[#2A2A30]">
              {sectionLabel}
            </span>
          </div>

          {/* Desktop: breadcrumb */}
          <Breadcrumb pathname={pathname} className="hidden md:flex" />

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-[#6B7280] text-xs hover:text-[#FAFAFA] transition-colors hidden md:block"
            >
              ← View site
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Nav (hidden on desktop) ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#111113] border-t border-[#2A2A30] z-40 md:hidden">
        <div className="flex items-stretch justify-around h-16">
          {navItems.map((item) => {
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
          <Link href="/profile" className="flex-1 flex flex-col items-center justify-center gap-1 py-2">
            <ChevronLeft className="w-5 h-5 text-[#6B7280]" strokeWidth={1.6} />
            <span className="text-[10px] font-medium text-[#6B7280]">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

// ── Breadcrumb (desktop only) ──────────────────────────────────────────────────

function Breadcrumb({ pathname, className }: { pathname: string; className?: string }) {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((seg, i, arr) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      isLast: i === arr.length - 1,
    }));

  if (segments.length === 0) return null;

  return (
    <nav className={cn("flex items-center gap-1.5 text-sm", className)}>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[#2A2A30]">/</span>}
          <span className={seg.isLast ? "text-[#FAFAFA] font-semibold" : "text-[#6B7280]"}>
            {seg.label}
          </span>
        </span>
      ))}
    </nav>
  );
}
