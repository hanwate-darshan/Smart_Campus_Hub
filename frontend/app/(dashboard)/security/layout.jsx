"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import RoleGuard from "@/components/shared/RoleGuard";
import useAuthStore from "@/store/auth.store";
import NotificationBell from "@/components/notifications/NotificationBell";

const navLinks = [
  { name: "Live Alerts", href: "/security/dashboard", icon: "🚨", dot: true },
  { name: "SOS History", href: "/security/history", icon: "📜" },
  { name: "Profile", href: "/security/profile", icon: "👤" },
  { name: "Notifications", href: "/security/notifications", icon: "🔔" },
];

export default function SecurityLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "/";
  };

  return (
    <RoleGuard allowedRoles={["security"]}>
      <div className="flex h-screen overflow-hidden" style={{ background: '#131314' }}>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ background: '#1e1f20', borderRight: '1px solid #3c4043' }}
        >
          <div className="h-14 flex items-center gap-2.5 px-4" style={{ borderBottom: '1px solid #3c4043' }}>
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="rounded-lg" />
            <span className="text-[14px] font-semibold text-[#e8eaed] tracking-tight">Smart Campus Hub</span>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-hide">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-[#f28b82]/15 text-[#f28b82]"
                      : "text-[#9aa0a6] hover:bg-[#282a2c] hover:text-[#e8eaed]"
                  }`}
                >
                  <span className="text-base w-5 text-center">{link.icon}</span>
                  <span className="flex-1">{link.name}</span>
                  {link.dot && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.5)]" />}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-3" style={{ borderTop: '1px solid #3c4043' }}>
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-[#f28b82] text-[#131314] flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "G"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#e8eaed] truncate">{user?.name || "Guard"}</p>
                <p className="text-[11px] text-[#5f6368]">Security</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-12 flex items-center justify-between px-4 shrink-0" style={{ borderBottom: '1px solid #3c4043' }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-lg text-[#9aa0a6] hover:bg-[#282a2c] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <span className="text-[13px] text-[#5f6368] hidden lg:block">Security Command</span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold tracking-wide ${isOnline ? "text-[#81c995]" : "text-[#5f6368]"}`}>
                  {isOnline ? "ONLINE" : "OFFLINE"}
                </span>
                <button
                  onClick={() => setIsOnline(!isOnline)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${isOnline ? "bg-[#81c995]" : "bg-[#5f6368]"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 mt-0.5 ${isOnline ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
                </button>
              </div>
              <div className="w-px h-5" style={{ background: '#3c4043' }} />
              <span className="text-[13px] text-[#9aa0a6] hidden sm:block">{user?.name || "Guard"}</span>
              <button
                onClick={handleLogout}
                className="text-[12px] px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all duration-300 hover:opacity-80"
                style={{ background: '#f28b82', color: '#131314' }}
              >
                Logout
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              key={pathname}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
