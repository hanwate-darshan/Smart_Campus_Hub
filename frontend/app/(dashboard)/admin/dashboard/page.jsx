"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { io } from "socket.io-client";
import Link from "next/link";
import CreateUserModal from "@/components/admin/CreateUserModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState("teacher");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get(`/api/admin/dashboard-stats`);
        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Setup Socket
    const socket = io(`${API_BASE}/notifications`);
    socket.emit("join_admin");

    socket.on("new_activity", () => {
      fetchStats();
    });

    return () => socket.disconnect();
  }, []);

  const openCreateModal = (role) => {
    setModalRole(role);
    setIsModalOpen(true);
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'new_registration': return '📝';
      case 'account_approved': return '✅';
      case 'account_rejected': return '❌';
      case 'account_suspended': return '🚫';
      case 'user_created': return '➕';
      case 'sos_alert': return '🚨';
      case 'complaint_filed': return '📋';
      default: return '➡️';
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time overview of Smart Campus Hub.</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Students" value={stats?.totalStudents || 0} icon="🎓" color="bg-blue-50 text-blue-600 dark:bg-blue-900/20" />
        <StatCard 
          title="Pending" 
          value={stats?.pendingApprovals || 0} 
          icon="⏳" 
          color="bg-amber-50 text-amber-600 dark:bg-amber-900/20"
          badge={stats?.pendingApprovals > 0} 
        />
        <StatCard title="Teachers" value={stats?.totalTeachers || 0} icon="👩‍🏫" color="bg-purple-50 text-purple-600 dark:bg-purple-900/20" />
        <StatCard title="Security" value={stats?.totalSecurity || 0} icon="🛡️" color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" />
        <StatCard title="Active Complaints" value={stats?.activeComplaints || 0} icon="📝" color="bg-slate-50 text-slate-600 dark:bg-slate-800" />
        <StatCard title="Active SOS" value={stats?.activeSOS || 0} icon="🚨" color="bg-red-50 text-red-600 dark:bg-red-900/20" badge={stats?.activeSOS > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QUICK ACTIONS */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-3 flex-1">
            <Link href="/admin/approvals" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800 transition font-medium text-slate-700 dark:text-slate-300">
              <span className="text-xl">⏳</span> Review Pending Approvals
            </Link>
            <button onClick={() => openCreateModal('teacher')} className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800 transition font-medium text-slate-700 dark:text-slate-300">
              <span className="text-xl">👩‍🏫</span> Create Teacher Account
            </button>
            <button onClick={() => openCreateModal('security')} className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800 transition font-medium text-slate-700 dark:text-slate-300">
              <span className="text-xl">🛡️</span> Create Security Account
            </button>
            <Link href="/admin/marketplace" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800 transition font-medium text-slate-700 dark:text-slate-300">
              <span className="text-xl">🏪</span> View Marketplace Queue
            </Link>
          </div>
        </div>

        {/* FEED */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Recent Activity</h2>
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-[400px]">
            {stats?.recentActivity?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <span className="text-4xl mb-3">👻</span>
                <h3 className="text-slate-500 font-medium pb-2">No activity yet.</h3>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {stats?.recentActivity?.map((log) => (
                  <li key={log._id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <div className="h-10 w-10 shrink-0 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-lg">
                      {getLogIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 break-words line-clamp-2">
                        {log.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <CreateUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} role={modalRole} />
    </div>
  );
}

function StatCard({ title, value, icon, color, badge }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 relative overflow-hidden group">
      {badge && (
        <span className="absolute top-4 right-4 h-3 w-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></span>
      )}
      <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-2xl mb-4 ${color}`}>
        {icon}
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</h3>
    </div>
  );
}
