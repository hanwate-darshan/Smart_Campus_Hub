"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Shield, Lock, ArrowRight, Zap, Users, Bell, Search } from "lucide-react";

const roles = [
  {
    key: "student", icon: <GraduationCap className="w-5 h-5" />, title: "Student", color: "#8ab4f8",
    desc: "Dashboard, marketplace, complaints & more",
    buttons: [
      { label: "Register", href: "/register", primary: true },
      { label: "Sign in", href: "/login?role=student", primary: false },
    ],
  },
  {
    key: "teacher", icon: <BookOpen className="w-5 h-5" />, title: "Teacher", color: "#81c995",
    desc: "Manage complaints & verify lost items",
    buttons: [{ label: "Sign in", href: "/login?role=teacher", primary: true }],
  },
  {
    key: "admin", icon: <Shield className="w-5 h-5" />, title: "Admin", color: "#c58af9",
    desc: "Users, analytics & platform moderation",
    buttons: [{ label: "Sign in", href: "/login?role=admin", primary: true }],
  },
  {
    key: "security", icon: <Lock className="w-5 h-5" />, title: "Security", color: "#f28b82",
    desc: "SOS alerts & campus safety monitoring",
    buttons: [{ label: "Sign in", href: "/login?role=security", primary: true }],
  },
];

const features = [
  { icon: <Zap className="w-4 h-4" />, label: "Real-time SOS Alerts" },
  { icon: <Search className="w-4 h-4" />, label: "Lost & Found" },
  { icon: <Users className="w-4 h-4" />, label: "Roommate Finder" },
  { icon: <Bell className="w-4 h-4" />, label: "Instant Notifications" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } } };
const item = { hidden: { opacity: 0, y: 24, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } } };

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col items-center min-h-screen relative overflow-hidden" style={{ background: '#131314' }}>
      {/* ── Mesh gradient background ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, #8ab4f815 0%, transparent 50%),
            radial-gradient(ellipse at 20% 80%, #c58af908 0%, transparent 40%),
            radial-gradient(ellipse at 80% 80%, #81c99508 0%, transparent 40%)
          `
        }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* ── Floating orbs ── */}
      <div className="absolute top-20 left-[15%] w-48 h-48 rounded-full blur-3xl opacity-20 animate-float" style={{ background: '#8ab4f8' }} />
      <div className="absolute top-60 right-[10%] w-40 h-40 rounded-full blur-3xl opacity-15 animate-pulse-slow" style={{ background: '#c58af9' }} />
      <div className="absolute bottom-40 left-[30%] w-56 h-56 rounded-full blur-3xl opacity-10 animate-float" style={{ background: '#81c995', animationDelay: '2s' }} />

      {/* ── Hero content ── */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-16 pb-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center mb-12">
          {/* Logo */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-3 mb-6 px-4 py-2 rounded-2xl"
            style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="rounded-lg" />
            <span className="text-[14px] font-bold text-[#e8eaed]">Smart Campus Hub</span>
          </motion.div>

          {/* Title */}
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#e8eaed] tracking-tight mb-4 leading-[1.1]">
            One stop solution for<br />
            <span className="bg-gradient-to-r from-[#8ab4f8] via-[#c58af9] to-[#81c995] bg-clip-text text-transparent">
              your campus life
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.5 }}
            className="text-[15px] text-[#9aa0a6] max-w-lg mx-auto leading-relaxed">
            A unified platform connecting students, teachers, admins, and security — everything your campus needs in one place.
          </motion.p>

          {/* Feature pills */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {features.map((f, i) => (
              <motion.span key={f.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.08 }} whileHover={{ scale: 1.05, borderColor: '#8ab4f8' }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium text-[#9aa0a6] border transition-all cursor-default"
                style={{ borderColor: '#3c4043', background: '#1e1f20' }}>
                <span style={{ color: '#8ab4f8' }}>{f.icon}</span> {f.label}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Role Cards ── */}
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {roles.map((role) => (
            <motion.div key={role.key} variants={item}
              whileHover={{ y: -4, borderColor: role.color, transition: { duration: 0.2 } }}
              className="group rounded-xl p-5 flex flex-col gap-4 transition-all duration-300 cursor-default"
              style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>

              {/* Icon */}
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.4 }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{ background: `${role.color}15`, color: role.color }}>
                  {role.icon}
                </motion.div>
                <div>
                  <h2 className="text-[14px] font-semibold text-[#e8eaed]">{role.title}</h2>
                  <p className="text-[11px] text-[#5f6368] leading-snug">{role.desc}</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mt-auto">
                {role.buttons.map((btn) => (
                  <Link key={btn.label} href={btn.href}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 group/btn ${
                      btn.primary ? 'hover:shadow-lg' : ''
                    }`}
                    style={btn.primary
                      ? { background: role.color, color: '#131314', boxShadow: `0 2px 8px ${role.color}25` }
                      : { background: 'transparent', color: role.color, border: `1px solid ${role.color}30` }
                    }>
                    {btn.label}
                    {btn.primary && <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />}
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>


      </div>
    </main>
  );
}
