"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Search, Ticket, User, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/store/authStore";

const USER_NAV = [
  { href: "/",          label: "Home",     exact: true,  icon: Home   },
  { href: "/search",    label: "Search",   exact: false, icon: Search },
  { href: "/my-parchi", label: "My Parchi",exact: false, icon: Ticket },
  { href: "/profile",   label: "Profile",  exact: false, icon: User   },
];

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuthStore();

  // Scanners use the same main-app nav as regular users.
  // Their scanner-specific 3-tab nav lives inside /scan/portal/*
  const navItems = USER_NAV;

  const [menuOpen, setMenuOpen] = useState(false);

  const DRAWER_LINKS = [
    { label: "Home",        href: "/" },
    { label: "Search Events", href: "/search" },
    { label: "My Parchi",   href: "/my-parchi" },
    { label: "About Us",    href: "/about" },
    { label: "Contact Us",  href: "/contact" },
    { label: "Help & Support", href: "/support" },
  ];

  return (
    <div className="flex min-h-[100svh] bg-background">

      {/* ── Mobile top nav (hidden on md+) ───────────────────────── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ background: "rgba(10,10,11,0.97)", borderBottom: "1px solid #2A2A30" }}
      >
        <Link href="/" className="flex items-center gap-0.5">
          <span className="text-xl font-black" style={{ color: "#FF6A3D" }}>parchi</span>
          <span className="text-xl font-black text-text">.pk</span>
        </Link>

        <button
          onClick={() => setMenuOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface2 transition-colors"
        >
          <Menu className="w-5 h-5 text-text" strokeWidth={2} />
        </button>
      </header>

      {/* ── Drawer overlay ───────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={() => setMenuOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed top-0 right-0 bottom-0 z-[70] w-72 flex flex-col"
              style={{ background: "#111113", borderLeft: "1px solid #2A2A30" }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 h-14" style={{ borderBottom: "1px solid #2A2A30" }}>
                <span className="font-bold text-text">Menu</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface2 transition-colors"
                >
                  <X className="w-4 h-4 text-muted" strokeWidth={2} />
                </button>
              </div>

              {/* Drawer links */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {DRAWER_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-text hover:bg-surface2 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Drawer footer */}
              <div className="px-5 py-5" style={{ borderTop: "1px solid #2A2A30" }}>
                <p className="text-xs text-muted">parchi.pk &copy; {new Date().getFullYear()}</p>
                <p className="text-xs text-muted mt-0.5">Discover events across Pakistan</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-surface border-r border-border fixed left-0 top-0 bottom-0 flex-col z-40">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/">
            <span className="text-2xl font-black" style={{ color: "#FF6A3D" }}>parchi</span>
            <span className="text-2xl font-black text-text">.pk</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors relative",
                  isActive ? "bg-primary/15 text-primary" : "text-muted hover:bg-surface2 hover:text-text"
                )}>
                  {isActive && (
                    <motion.div
                      layoutId="sidebarIndicator"
                      className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  <span className={cn("text-sm", isActive ? "font-semibold text-primary" : "font-medium")}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        {profile && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">
                  {(profile.display_name ?? profile.email ?? "U")[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-text text-sm truncate">{profile.display_name ?? "User"}</p>
                <p className="text-muted text-xs truncate">{profile.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content — top padding on mobile for the fixed top nav */}
      <main className="flex-1 md:ml-64 w-full pb-[60px] md:pb-0 pt-14 md:pt-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom"
        style={{ background: "rgba(10,10,11,0.95)", borderTop: "1px solid #2A2A30" }}
      >
        <div className="flex items-center h-[56px]">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center justify-center gap-[3px] h-full">
                <Icon
                  className="w-[22px] h-[22px] transition-colors"
                  style={{ color: isActive ? "#FF6A3D" : "#6B7280" }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span
                  className="text-[10px] font-medium leading-none transition-colors"
                  style={{ color: isActive ? "#FF6A3D" : "#6B7280" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
