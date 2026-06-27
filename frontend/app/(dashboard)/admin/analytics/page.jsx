"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Users, AlertTriangle, MessageSquare, Briefcase, ShoppingBag, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/api/admin/dashboard-stats");
        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#8ab4f8] animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#e8eaed]">Platform Analytics</h1>
          <p className="text-sm text-[#9aa0a6] mt-1">Overview of Campus Hub operations and user metrics.</p>
        </div>
      </div>

      {/* User Statistics */}
      <h2 className="text-lg font-semibold text-[#e8eaed] pt-4">User Demographics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1e1f20] border border-[#3c4043] rounded-xl p-5 hover:border-[#8ab4f8]/50 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#9aa0a6]">Total Users</p>
            <Users className="w-5 h-5 text-[#8ab4f8]" />
          </div>
          <p className="text-3xl font-bold text-[#e8eaed] mt-2">{stats.totalStudents + stats.totalTeachers + stats.totalSecurity}</p>
        </div>
        
        <div className="bg-[#1e1f20] border border-[#3c4043] rounded-xl p-5 hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#9aa0a6]">Students</p>
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-[#e8eaed] mt-2">{stats.totalStudents}</p>
        </div>

        <div className="bg-[#1e1f20] border border-[#3c4043] rounded-xl p-5 hover:border-purple-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#9aa0a6]">Teachers</p>
            <Briefcase className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-[#e8eaed] mt-2">{stats.totalTeachers}</p>
        </div>

        <div className="bg-[#1e1f20] border border-[#3c4043] rounded-xl p-5 hover:border-amber-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#9aa0a6]">Security Staff</p>
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-[#e8eaed] mt-2">{stats.totalSecurity}</p>
        </div>
      </div>

      {/* Platform Activity */}
      <h2 className="text-lg font-semibold text-[#e8eaed] pt-4">Platform Activity</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1e1f20] border border-[#3c4043] rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#9aa0a6]">Active SOS Alerts</p>
              <p className="text-2xl font-bold text-[#e8eaed] mt-1">{stats.activeSOS}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1e1f20] border border-[#3c4043] rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-pink-500/10 rounded-lg">
              <MessageSquare className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#9aa0a6]">Open Complaints</p>
              <p className="text-2xl font-bold text-[#e8eaed] mt-1">{stats.activeComplaints}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Account Status */}
      <div className="mt-8 p-6 bg-[#282a2c]/50 rounded-xl border border-[#3c4043]">
        <h3 className="text-sm font-medium text-[#9aa0a6] mb-4 uppercase tracking-wider">Account Health</h3>
        <div className="flex flex-wrap gap-8">
           <div>
              <p className="text-xs text-[#9aa0a6]">Pending Approvals</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{stats.pendingApprovals}</p>
           </div>
           <div>
              <p className="text-xs text-[#9aa0a6]">Total Active Students</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{stats.totalStudents}</p>
           </div>
        </div>
      </div>

    </div>
  );
}
