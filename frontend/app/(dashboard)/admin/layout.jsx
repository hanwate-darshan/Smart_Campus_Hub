"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import RoleGuard from "@/components/shared/RoleGuard";
import useAuthStore from "@/store/auth.store";
import NotificationBell from "@/components/notifications/NotificationBell";
import useNotificationStore from "@/store/notification.store";
import api from "@/lib/api";
import { getNamespace } from "@/config/socket";

const navLinks = [
  { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
  { name: "Pending Approvals", href: "/admin/approvals", icon: "⏳" },
  { name: "All Users", href: "/admin/users", icon: "👥" },
  { name: "Complaints", href: "/admin/complaints", icon: "📝" },
  { name: "Marketplace", href: "/admin/marketplace", icon: "🏪" },
  { name: "SOS Analytics", href: "/admin/sos", icon: "🚨" },
  { name: "Lost & Found", href: "/admin/lost-found", icon: "🔍" },
  { name: "Analytics", href: "/admin/analytics", icon: "📈" },
  { name: "Profile", href: "/admin/profile", icon: "👤" },
];

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingLostFoundCount, setPendingLostFoundCount] = useState(0);
  const [pendingMarketplaceCount, setPendingMarketplaceCount] = useState(0);

  const fetchAdminStats = async () => {
    try {
      if (!user) return;
      const { data } = await api.get("/api/admin/dashboard-stats");
      setPendingApprovalsCount(data.data.pendingApprovals || 0);
      setPendingLostFoundCount(data.data.pendingLostFound || 0);
      setPendingMarketplaceCount(data.data.pendingMarketplace || 0);
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
    }
  };

  useEffect(() => {
    fetchAdminStats();
    
    if (!user) return;
    const notificationsNs = getNamespace("/notifications");
    
    notificationsNs.on("new_activity", fetchAdminStats);
    notificationsNs.on("notification_push", fetchAdminStats);
    
    return () => {
      notificationsNs.off("new_activity", fetchAdminStats);
      notificationsNs.off("notification_push", fetchAdminStats);
    };
  }, [user]);

  const totalCount = unreadCount + pendingApprovalsCount + pendingLostFoundCount + pendingMarketplaceCount;

  const handleLogout = () => {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "/";
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
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
                  {link.name === "Notifications" && unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#f28b82', color: '#131314' }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  {link.name === "Pending Approvals" && pendingApprovalsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#f28b82', color: '#131314' }}>
                      {pendingApprovalsCount > 9 ? "9+" : pendingApprovalsCount}
                    </span>
                  )}
                  {link.name === "Lost & Found" && pendingLostFoundCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#f28b82', color: '#131314' }}>
                      {pendingLostFoundCount > 9 ? "9+" : pendingLostFoundCount}
                    </span>
                  )}
                  {link.name === "Marketplace" && pendingMarketplaceCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#f28b82', color: '#131314' }}>
                      {pendingMarketplaceCount > 9 ? "9+" : pendingMarketplaceCount}
                    </span>
                  )}
                  {link.dot && link.name !== "Notifications" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-3" style={{ borderTop: '1px solid #3c4043' }}>
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-[#8ab4f8] text-[#131314] flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#e8eaed] truncate">{user?.name || "Admin"}</p>
                <p className="text-[11px] text-[#5f6368]">Administrator</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-12 flex items-center justify-between px-4 shrink-0" style={{ borderBottom: '1px solid #3c4043' }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden relative p-1.5 rounded-lg text-[#9aa0a6] hover:bg-[#282a2c] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
                {totalCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold"
                    style={{ background: '#f28b82', color: '#131314' }}
                  >
                    {totalCount > 9 ? "9+" : totalCount}
                  </span>
                )}
              </button>
              <span className="text-[13px] text-[#5f6368] hidden lg:block">Admin Console</span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <span className="text-[13px] text-[#9aa0a6] hidden sm:block">{user?.name || "Admin"}</span>
              <button
                onClick={handleLogout}
                className="text-[12px] px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all duration-300 hover:opacity-80"
                style={{ background: '#c58af9', color: '#131314' }}
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
