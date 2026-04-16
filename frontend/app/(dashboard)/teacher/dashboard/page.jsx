"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BarChart3, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Users, 
  ArrowRight,
  TrendingUp,
  Package,
  Loader2,
  Calendar
} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function TeacherDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/api/complaints/stats");
        setStats(data.data);
      } catch (err) {
        toast.error("Failed to fetch dashboard metrics");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const statCards = [
    { 
      label: "Total Complaints", 
      value: stats?.total || 0, 
      icon: <MessageSquare className="w-6 h-6" />, 
      color: "blue",
      description: "Lifetime submissions"
    },
    { 
      label: "Pending Action", 
      value: stats?.pending || 0, 
      icon: <Clock className="w-6 h-6" />, 
      color: "amber",
      description: "Awaiting review or in progress"
    },
    { 
      label: "Recently Resolved", 
      value: stats?.resolved || 0, 
      icon: <CheckCircle2 className="w-6 h-6" />, 
      color: "emerald",
      description: "Successfully closed cases"
    },
    { 
      label: "Escalated Issues", 
      value: stats?.escalated || 0, 
      icon: <AlertCircle className="w-6 h-6" />, 
      color: "red",
      description: "Ignored for 48+ hours",
      urgent: (stats?.escalated || 0) > 0
    },
  ];

  const STATUS_COLORS = {
    submitted: "text-slate-500 bg-slate-50",
    in_review: "text-blue-500 bg-blue-50",
    in_progress: "text-amber-500 bg-amber-50",
    resolved: "text-emerald-500 bg-emerald-50",
    closed: "text-zinc-500 bg-zinc-50",
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* --- WELCOME SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">System Overview</h1>
          <p className="text-slate-500 font-medium">Campus response metrics and recent activity</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
          <Calendar className="w-4 h-4" /> Last Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div 
            key={i}
            className={`bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl ${card.urgent ? 'ring-2 ring-red-500 ring-offset-4 dark:ring-offset-slate-900' : ''}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:scale-110 ${
              card.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
              card.color === 'amber' ? 'bg-amber-50 text-amber-600' : 
              card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 
              'bg-red-50 text-red-600'
            }`}>
              {card.icon}
            </div>
            
            <p className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter mb-1">
              {card.value}
            </p>
            <h4 className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">{card.label}</h4>
            <p className="text-[10px] text-slate-400 font-medium mt-4">{card.description}</p>
          </div>
        ))}
      </div>

      {/* --- MAIN SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Recent Complaints */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-emerald-500" /> Recent Complaints
            </h2>
            <Link href="/teacher/complaints" className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1">
              VIEW ALL <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporter</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {stats?.recent?.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-[200px]">{c.title}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-medium text-slate-500">{c.studentName}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${STATUS_COLORS[c.status]}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-medium text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Links / Tasks */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Package className="text-blue-500" /> Module Access
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm space-y-4">
            <Link 
              href="/teacher/complaints"
              className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-transparent hover:border-blue-500/20 transition-all font-bold"
            >
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-slate-800 dark:text-white">Complaints</p>
                    <p className="text-[10px] text-slate-400 font-medium">Manage student issues</p>
                 </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </Link>

            <Link 
              href="/teacher/lost-found"
              className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-transparent hover:border-emerald-500/20 transition-all font-bold"
            >
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Package className="text-sm" />
                 </div>
                 <div>
                    <p className="text-slate-800 dark:text-white">Lost & Found</p>
                    <p className="text-[10px] text-slate-400 font-medium">Verify found items</p>
                 </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </Link>

            <div className="p-6 bg-slate-100/50 dark:bg-slate-800/50 rounded-[1.5rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
               <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">More Modules Coming</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
