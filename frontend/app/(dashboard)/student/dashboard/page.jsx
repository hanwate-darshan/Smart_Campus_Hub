"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Bell, 
  ShoppingBag, 
  Search, 
  Users, 
  User, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Package,
  Clock,
  Loader2
} from "lucide-react";
import useAuthStore from "@/store/auth.store";
import api from "@/lib/api";

const featureCards = [
  {
    title: "Report a Problem",
    description: "Submit campus complaints and track their status",
    icon: <AlertCircle className="w-6 h-6" />,
    href: "/student/complaints",
    color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    title: "Campus Marketplace",
    description: "Buy and sell items with verified students",
    icon: <ShoppingBag className="w-6 h-6" />,
    href: "/student/marketplace",
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
  },
  {
    title: "Lost & Found",
    description: "Report or find lost items on campus",
    icon: <Search className="w-6 h-6" />,
    href: "/student/lost-found",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
  },
  {
    title: "Find a Roommate",
    description: "Match with compatible roommates",
    icon: <Users className="w-6 h-6" />,
    href: "/student/roommate",
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
  },
  {
    title: "Edit Profile",
    description: "Update your campus profile",
    icon: <User className="w-6 h-6" />,
    href: "/student/profile",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
  },
  {
    title: "Notifications",
    description: "View all your alerts and updates",
    icon: <Bell className="w-6 h-6" />,
    href: "/student/notifications",
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
  }
];

export default function StudentDashboardPage() {
  const { user } = useAuthStore();
  const [greeting, setGreeting] = useState("Good morning");
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const fetchActivities = async () => {
      try {
        const { data } = await api.get("/api/notifications?limit=5");
        setActivities(data.data || []);
      } catch (err) {
        // Quietly fail to prevent error leak
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivities();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            {greeting}, {user?.name?.split(' ')[0] || "Student"}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Here's what's happening on campus today.
          </p>
        </div>
        <div className="text-sm font-medium px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 shadow-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Emergency SOS Section */}
      <div className="flex justify-center py-4">
        <Link 
          href="/student/sos"
          className="group relative flex flex-col items-center justify-center p-8 rounded-full border-8 border-red-50 dark:border-red-900/20 bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-red-500/30"
        >
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20 group-hover:opacity-40" />
          
          <div className="relative flex flex-col items-center text-center">
            <span className="text-white font-black text-2xl md:text-3xl tracking-tighter">SOS EMERGENCY</span>
            <span className="text-red-100 text-xs font-medium mt-1 uppercase tracking-widest">Tap to alert security</span>
          </div>
        </Link>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Active Complaints", count: "0", icon: <AlertCircle className="w-5 h-5"/>, color: "text-orange-600" },
          { label: "Market Listings", count: "0", icon: <Package className="w-5 h-5"/>, color: "text-emerald-600" },
          { label: "Lost Items", count: "0", icon: <Search className="w-5 h-5"/>, color: "text-blue-600" },
          { label: "Roommate Requests", count: "0", icon: <Users className="w-5 h-5"/>, color: "text-purple-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className={`p-2 rounded-lg inline-flex ${stat.color} bg-current/10 mb-4`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.count}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Features Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Quick Access</h2>
          <TrendingUp className="text-slate-400 w-5 h-5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCards.map((card, i) => (
            <Link key={i} href={card.href} className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 ${card.color}`}>
                {card.icon}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">{card.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{card.description}</p>
              <div className="flex items-center text-blue-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Get Started <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Section: Recent Activity */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 dark:text-white">Recent Activity</h2>
          <Link href="/student/notifications" className="text-sm text-blue-600 hover:underline font-medium">View All</Link>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {loadingActivities ? (
            <div className="px-6 py-10 text-center text-slate-400">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
              <p className="text-sm">Loading activity...</p>
            </div>
          ) : activities.length > 0 ? (
            activities.map((act) => (
              <div key={act._id} className="px-6 py-4 flex gap-4 items-start hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{act.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{act.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400 capitalize">{act.type?.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className="text-xs text-slate-400">
                      {new Date(act.createdAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-10 text-center text-slate-400">
               <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
               <p className="text-sm">No new activities to show</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
