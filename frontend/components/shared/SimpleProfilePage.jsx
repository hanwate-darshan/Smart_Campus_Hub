"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "@/store/auth.store";
import { Mail, Phone, Calendar, Shield, User, LogOut, Monitor, Fingerprint, KeyRound, Activity } from "lucide-react";

export default function SimpleProfilePage({ role }) {
  const { user, clearAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState("overview");

  const handleLogout = () => { clearAuth(); if (typeof window !== "undefined") window.location.href = "/"; };

  const accentMap = { student: '#8ab4f8', teacher: '#81c995', admin: '#c58af9', security: '#f28b82' };
  const accent = accentMap[role] || '#8ab4f8';
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";
  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return "N/A"; } };

  const infoItems = [
    { icon: <User className="w-4 h-4" />, label: "Full Name", value: user?.name || "Not set" },
    { icon: <Mail className="w-4 h-4" />, label: "Email Address", value: user?.email || "Not set" },
    { icon: <Phone className="w-4 h-4" />, label: "Phone Number", value: user?.phone || "Not set" },
    { icon: <Shield className="w-4 h-4" />, label: "Role", value: role, isAccent: true },
    { icon: <Calendar className="w-4 h-4" />, label: "Member Since", value: fmtDate(user?.createdAt) },
    { icon: <Activity className="w-4 h-4" />, label: "Account Status", value: "Active", isGreen: true },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-4xl mx-auto pb-8">

      {/* ═══════════ HERO BANNER ═══════════ */}
      <div className="relative rounded-2xl overflow-hidden mb-6" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
        <div className="h-44 relative overflow-hidden">
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse at 20% 50%, ${accent}30 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, ${accent}20 0%, transparent 50%),
              radial-gradient(ellipse at 50% 80%, #c58af920 0%, transparent 50%),
              linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)
            `
          }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-8 right-16 w-16 h-16 rounded-full blur-xl" style={{ background: `${accent}25` }} />
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-4 left-24 w-24 h-24 rounded-full blur-2xl" style={{ background: `${accent}15` }} />
        </div>

        <div className="relative px-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <motion.div whileHover={{ scale: 1.03 }} className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-[#1e1f20]"
              style={{ background: `${accent}15` }}>
              {user?.profilePicUrl ? (
                <img src={user.profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ color: accent }}>
                  {initial}
                </div>
              )}
            </motion.div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-[#e8eaed] truncate">{user?.name || "User"}</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: '#1b3a1b', color: '#81c995' }}>
                  <Activity className="w-3 h-3" /> Active
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider capitalize"
                  style={{ background: `${accent}20`, color: accent }}>
                  {role}
                </span>
              </div>
              <p className="text-[13px] text-[#9aa0a6] mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ TABS ═══════════ */}
      <div className="flex items-center gap-1 mb-5 px-1">
        {["overview", "security"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-[12px] font-medium capitalize transition-all duration-200 ${
              activeTab === tab ? 'text-[#e8eaed]' : 'text-[#5f6368] hover:text-[#9aa0a6] hover:bg-[#1e1f20]'
            }`}
            style={activeTab === tab ? { background: '#1e1f20', border: '1px solid #3c4043' } : {}}>
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Left column */}
            <div className="lg:col-span-2">
              <div className="rounded-xl p-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
                    <Fingerprint className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-[13px] font-semibold text-[#e8eaed]">Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {infoItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors hover:bg-[#282a2c]/50" style={{ background: '#282a2c' }}>
                      <div className="text-[#5f6368]">{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[#5f6368] uppercase tracking-wider font-medium">{item.label}</p>
                        <p className={`text-[13px] font-medium truncate mt-0.5 capitalize`}
                          style={{ color: item.isAccent ? accent : item.isGreen ? '#81c995' : '#e8eaed' }}>
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="rounded-xl p-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
                <h3 className="text-[12px] font-semibold text-[#5f6368] uppercase tracking-wider mb-3">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-[#81c995]" />
                      <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-30 bg-[#81c995]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#81c995]">Online</p>
                      <p className="text-[11px] text-[#5f6368]">Currently active</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
                <h3 className="text-[12px] font-semibold text-[#5f6368] uppercase tracking-wider mb-3">Permissions</h3>
                <div className="flex flex-wrap gap-2">
                  {(role === 'admin' ? ['Full Access', 'User Management', 'Analytics', 'Moderation'] :
                    role === 'teacher' ? ['Complaints', 'Lost & Found', 'Verification'] :
                    ['SOS Alerts', 'Emergency Response', 'Campus Patrol']).map(p => (
                    <span key={p} className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                      style={{ background: `${accent}10`, color: accent, border: `1px solid ${accent}20` }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "security" && (
          <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }} className="space-y-4">

            {/* Session */}
            <div className="rounded-xl p-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
                  <Monitor className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[13px] font-semibold text-[#e8eaed]">Active Sessions</h3>
              </div>
              <div className="flex items-center gap-4 px-4 py-3 rounded-xl" style={{ background: '#282a2c' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
                  <Monitor className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-[#e8eaed]">Current Browser</p>
                  <p className="text-[11px] text-[#5f6368]">Active now</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#81c995]" />
              </div>
            </div>

            {/* Auth Info */}
            <div className="rounded-xl p-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[13px] font-semibold text-[#e8eaed]">Authentication</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: '#282a2c' }}>
                  <span className="text-[12px] text-[#5f6368]">Login Method</span>
                  <span className="text-[13px] font-medium text-[#e8eaed]">Email & Password</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: '#282a2c' }}>
                  <span className="text-[12px] text-[#5f6368]">Two-Factor Auth</span>
                  <span className="text-[12px] font-medium px-2 py-0.5 rounded-md" style={{ background: '#3c3000', color: '#fdd663' }}>Not enabled</span>
                </div>
              </div>
            </div>

            {/* ── DANGER ZONE ── */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #5c2020' }}>
              <div className="px-5 py-3" style={{ background: 'linear-gradient(135deg, #2c1515 0%, #3c1a1a 100%)' }}>
                <h3 className="text-[13px] font-semibold text-[#f28b82] flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Danger Zone
                </h3>
              </div>
              <div className="px-5 py-4" style={{ background: '#1e1f20' }}>
                <p className="text-[12px] text-[#9aa0a6] mb-4">Logging out will clear your session data. You will need to enter your credentials again.</p>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-300 cursor-pointer hover:opacity-80"
                  style={{ background: accent, color: '#131314' }}>
                  <LogOut className="w-3.5 h-3.5" /> Logout from this device
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
