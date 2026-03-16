/**
 * app/scan/portal/layout.tsx
 *
 * Scanner Portal layout — wraps all /scan/portal/* pages with the
 * 3-tab scanner nav: Events | Scanner | Profile.
 *
 * This is a completely separate experience from MobileLayout.
 * Scanners reach it from their normal Profile page via "Scanner Portal".
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ticket, User } from "lucide-react";

const TABS = [
  { href: "/scan/portal", label: "Events",  icon: Ticket, exact: true  },
  { href: "/profile",     label: "Profile", icon: User,   exact: false },
];

export default function ScannerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-[100svh] bg-background">

      {/* Top bar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ background: "rgba(10,10,11,0.97)", borderBottom: "1px solid #2A2A30" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl font-black" style={{ color: "#FF6A3D" }}>parchi</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
            style={{
              color: "#10B981",
              background: "rgba(16,185,129,0.10)",
              border: "1px solid rgba(16,185,129,0.20)",
            }}
          >
            scanner
          </span>
        </div>
        {/* Exit back to main app */}
        <Link
          href="/"
          className="text-xs font-medium"
          style={{ color: "#6B7280" }}
        >
          ← Main App
        </Link>
      </header>

      {/* Page content */}
      <main className="flex-1 pt-14 pb-[60px]">{children}</main>

      {/* Bottom 3-tab nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ background: "rgba(10,10,11,0.95)", borderTop: "1px solid #2A2A30" }}
      >
        <div className="flex items-center h-[56px]">
          {TABS.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex-1 flex flex-col items-center justify-center gap-[3px] h-full"
              >
                <Icon
                  className="w-[22px] h-[22px] transition-colors"
                  style={{ color: isActive ? "#FF6A3D" : "#6B7280" }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span
                  className="text-[10px] font-medium leading-none transition-colors"
                  style={{ color: isActive ? "#FF6A3D" : "#6B7280" }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
