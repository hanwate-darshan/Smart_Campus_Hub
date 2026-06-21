"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import useAuthStore from "@/store/auth.store";
import { 
  Mail, Phone, ShieldCheck, User, LogOut, 
  Settings, Bell, Key, Activity, Cpu, 
  Users, Server, Globe, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminProfilePage() {
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => { 
    clearAuth(); 
    if (typeof window !== "undefined") window.location.href = "/"; 
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || "A";

  const adminStats = [
    { label: "System Uptime", value: "99.9%", icon: <Activity className="w-5 h-5 text-emerald-400" /> },
    { label: "Managed Users", value: "1,248", icon: <Users className="w-5 h-5 text-blue-400" /> },
    { label: "Server Load", value: "24%", icon: <Cpu className="w-5 h-5 text-purple-400" /> },
    { label: "Active Nodes", value: "12/12", icon: <Server className="w-5 h-5 text-orange-400" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-[#3c4043] bg-white dark:bg-[#1e1f20]"
      >
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600">
          {/* Decorative background elements */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 150%, white 0%, transparent 50%)" }}></div>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% -50%, white 0%, transparent 50%)" }}></div>
        </div>
        
        <div className="relative px-8 pb-8 pt-32 sm:pt-36 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-32 h-32 rounded-2xl bg-white dark:bg-[#131314] shadow-2xl ring-4 ring-white dark:ring-[#1e1f20] flex items-center justify-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-purple-500 to-blue-500 z-10"
          >
            {user?.profilePicUrl ? (
               <img src={user.profilePicUrl} alt="Admin" className="w-full h-full rounded-2xl object-cover" />
            ) : initial}
          </motion.div>
          
          <div className="flex-1 text-center sm:text-left z-10">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight">
              {user?.name || "Super Admin"}
            </h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-[#3c2a4f] dark:text-[#c58af9] rounded-lg text-sm font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> System Administrator
              </span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-[#1b3a1b] dark:text-[#81c995] rounded-lg text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> All Systems Nominal
              </span>
            </div>
          </div>
          
          <div className="z-10 mt-4 sm:mt-0">
             <button onClick={handleLogout} className="px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all duration-300 cursor-pointer hover:opacity-80" style={{ background: '#c58af9', color: '#131314' }}>
               <LogOut className="w-4 h-4" /> Sign Out
             </button>
          </div>
        </div>
      </motion.div>

      {/* Admin Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {adminStats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-[#1e1f20] p-5 rounded-2xl border border-slate-200 dark:border-[#3c4043] shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-[#282a2c] flex items-center justify-center">
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-[#9aa0a6] uppercase tracking-wider">{stat.label}</p>
              <h4 className="text-xl font-bold text-slate-800 dark:text-[#e8eaed] mt-0.5">{stat.value}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Info */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 space-y-6"
        >
          <div className="bg-white dark:bg-[#1e1f20] rounded-3xl border border-slate-200 dark:border-[#3c4043] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-[#3c4043]">
              <h3 className="text-lg font-bold text-slate-800 dark:text-[#e8eaed] flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500 dark:text-[#8ab4f8]" /> Personal Details
              </h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-[#8ab4f8]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-[#9aa0a6]">Email Address</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-[#e8eaed] mt-0.5">{user?.email || "admin@campushub.edu"}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-[#3c2a4f] flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-purple-600 dark:text-[#c58af9]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-[#9aa0a6]">Phone Number</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-[#e8eaed] mt-0.5">{user?.phone || "+1 (555) 000-0000"}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-[#4f2a1a] flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-orange-600 dark:text-[#fcad70]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-[#9aa0a6]">Region</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-[#e8eaed] mt-0.5">Global Infrastructure</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column - System Privileges & Security */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Privileges */}
          <div className="bg-white dark:bg-[#1e1f20] rounded-3xl border border-slate-200 dark:border-[#3c4043] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-[#3c4043] flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-[#e8eaed] flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-500 dark:text-[#c58af9]" /> Access & Privileges
              </h3>
              <button className="text-sm text-blue-600 dark:text-[#8ab4f8] font-semibold hover:underline">Manage Roles</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "User Management", desc: "Create, edit, suspend, and delete users.", color: "text-blue-500 dark:text-[#8ab4f8]", bg: "bg-blue-50 dark:bg-[#1e3a5f]" },
                  { title: "System Configuration", desc: "Modify global platform settings.", color: "text-purple-500 dark:text-[#c58af9]", bg: "bg-purple-50 dark:bg-[#3c2a4f]" },
                  { title: "Security Protocols", desc: "Manage authentication and API keys.", color: "text-emerald-500 dark:text-[#81c995]", bg: "bg-emerald-50 dark:bg-[#1b3a1b]" },
                  { title: "Financial Dashboard", desc: "View payments and subscriptions.", color: "text-amber-500 dark:text-[#fdd663]", bg: "bg-amber-50 dark:bg-[#4f401a]" },
                ].map((privilege, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl border border-slate-100 dark:border-[#3c4043] hover:bg-slate-50 dark:hover:bg-[#282a2c] transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${privilege.bg} ${privilege.color}`}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-[#e8eaed]">{privilege.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-[#9aa0a6] mt-1">{privilege.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white dark:bg-[#1e1f20] rounded-3xl border border-slate-200 dark:border-[#3c4043] shadow-sm overflow-hidden">
             <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#282a2c] flex items-center justify-center">
                    <Bell className="w-6 h-6 text-slate-600 dark:text-[#9aa0a6]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-[#e8eaed]">System Notifications</h3>
                    <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">Receive alerts for critical system events</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#131314] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                </label>
             </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
