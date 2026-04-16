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
  { name: "Dashboard", href: "/teacher/dashboard", icon: "📊" },
  { name: "Complaints", href: "/teacher/complaints", icon: "📝" },
  { name: "Lost & Found", href: "/teacher/lost-found", icon: "🔍" },
  { name: "Profile", href: "/teacher/profile", icon: "👤" },
  { name: "Notifications", href: "/teacher/notifications", icon: "🔔" },
];

export default function TeacherLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "/";
  };

  return (
    <RoleGuard allowedRoles={["teacher"]}>
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
                      ? "bg-[#8ab4f8]/15 text-[#8ab4f8]"
                      : "text-[#9aa0a6] hover:bg-[#282a2c] hover:text-[#e8eaed]"
                  }`}
                >
                  <span className="text-base w-5 text-center">{link.icon}</span>
                  <span className="flex-1">{link.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-3" style={{ borderTop: '1px solid #3c4043' }}>
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-[#81c995] text-[#131314] flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "T"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#e8eaed] truncate">{user?.name || "Teacher"}</p>
                <p className="text-[11px] text-[#5f6368]">Teacher</p>
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
              <span className="text-[13px] text-[#5f6368] hidden lg:block">Teacher Portal</span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={handleLogout}
                className="text-[12px] px-3 py-1.5 rounded-lg text-[#9aa0a6] hover:bg-[#282a2c] hover:text-[#e8eaed] transition-colors font-medium"
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
