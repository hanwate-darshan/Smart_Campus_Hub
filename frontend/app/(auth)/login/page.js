"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import useAuthStore from "@/store/auth.store";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, LogIn, AlertTriangle, Clock, ShieldX, Loader2 } from "lucide-react";

const roleMeta = {
  student:  { label: "Student",  color: "#8ab4f8", emoji: "🎓", gradient: "from-blue-600/20 via-indigo-600/10" },
  teacher:  { label: "Teacher",  color: "#81c995", emoji: "📚", gradient: "from-emerald-600/20 via-teal-600/10" },
  admin:    { label: "Admin",    color: "#c58af9", emoji: "🛡️", gradient: "from-purple-600/20 via-violet-600/10" },
  security: { label: "Security", color: "#f28b82", emoji: "🔒", gradient: "from-red-600/20 via-orange-600/10" },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "student";
  const setAuth = useAuthStore((state) => state.setAuth);
  const meta = roleMeta[role] || roleMeta.student;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [focused, setFocused] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", { email, password, role });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      const redir = { student: "/student/dashboard", teacher: "/teacher/dashboard", admin: "/admin/dashboard", security: "/security/dashboard" };
      router.push(redir[role] || "/student/dashboard");
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Login failed";
      if (msg.toLowerCase().includes("pending")) setError({ type: "pending", message: "Your account is under review. Please wait for admin approval." });
      else if (msg.toLowerCase().includes("not approved") || msg.toLowerCase().includes("rejected")) setError({ type: "rejected", message: "Your registration was not approved. Contact administration." });
      else if (msg.toLowerCase().includes("suspended")) setError({ type: "suspended", message: "Your account has been suspended. Contact administration." });
      else setError({ type: "generic", message: err.response ? msg : "Network error. Please try again." });
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/api/auth/google-login", { token: credentialResponse.credential, role });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      const redir = { student: "/student/dashboard", teacher: "/teacher/dashboard", admin: "/admin/dashboard", security: "/security/dashboard" };
      toast.success("Google Login Successful!");
      router.push(redir[role] || "/student/dashboard");
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Google Login failed";
      setError({ type: "generic", message: msg }); toast.error(msg);
    } finally { setLoading(false); }
  };

  const errorIcons = { pending: <Clock className="w-4 h-4" />, rejected: <ShieldX className="w-4 h-4" />, suspended: <ShieldX className="w-4 h-4" />, generic: <AlertTriangle className="w-4 h-4" /> };

  return (
    <main className="flex min-h-screen" style={{ background: '#131314' }}>
      {/* ── Left panel: decorative ── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center">
        {/* Mesh gradient background */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse at 30% 20%, ${meta.color}25 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, ${meta.color}15 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, #c58af910 0%, transparent 60%),
            linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)
          `
        }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
        {/* Floating orbs */}
        <motion.div animate={{ y: [0, -20, 0], x: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-3xl" style={{ background: `${meta.color}20` }} />
        <motion.div animate={{ y: [0, 15, 0], x: [0, -12, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full blur-3xl" style={{ background: `${meta.color}15` }} />
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-20" style={{ background: '#c58af9' }} />

        {/* Content */}
        <div className="relative z-10 max-w-sm px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-8">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded-xl" />
              <span className="text-lg font-bold text-white/90">Smart Campus Hub</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
              Welcome back to<br />
              <span style={{ color: meta.color }}>{meta.label} Portal</span>
            </h2>
            <p className="text-[14px] text-white/40 leading-relaxed">
              One stop solution for your campus life. Sign in to access your personalized dashboard.
            </p>

            {/* Feature pills */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-wrap gap-2 mt-8">
              {["Real-time Alerts", "Secure Access", "24/7 Support"].map((f, i) => (
                <motion.span key={f} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.1 }}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium border"
                  style={{ background: `${meta.color}08`, color: `${meta.color}cc`, borderColor: `${meta.color}20` }}>
                  {f}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-sm"
        >
          {/* Back */}
          <motion.div whileHover={{ x: -3 }} className="inline-block mb-8">
            <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[#5f6368] hover:text-[#8ab4f8] transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Back to home
            </Link>
          </motion.div>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-xl" />
            <span className="text-[14px] font-bold text-[#e8eaed]">Smart Campus Hub</span>
          </div>

          {/* Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{meta.emoji}</span>
              <h1 className="text-xl font-bold text-[#e8eaed]">{meta.label} Login</h1>
            </div>
            <p className="text-[13px] text-[#5f6368]">Enter your credentials to access your account</p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }}
                className="mb-5 overflow-hidden">
                <div className="flex items-start gap-3 p-3.5 rounded-xl text-[13px]"
                  style={{
                    background: error.type === "pending" ? '#2c2a00' : '#2c1515',
                    border: `1px solid ${error.type === "pending" ? '#5f5600' : '#5c2020'}`,
                    color: error.type === "pending" ? '#fdd663' : '#f28b82',
                  }}>
                  {errorIcons[error.type]}
                  <span className="flex-1">{error.message}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-2">Email Address</label>
              <motion.div whileTap={{ scale: 0.995 }} className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                  style={{ color: focused === 'email' ? meta.color : '#5f6368' }}>
                  <Mail className="w-4 h-4" />
                </div>
                <input id="login-email" type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  placeholder="you@college.edu" required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] transition-all duration-200 focus:outline-none placeholder:text-[#5f6368]"
                  style={{
                    background: '#1e1f20',
                    border: `1.5px solid ${focused === 'email' ? meta.color : '#3c4043'}`,
                    color: '#e8eaed',
                    boxShadow: focused === 'email' ? `0 0 0 3px ${meta.color}15` : 'none',
                  }}
                />
              </motion.div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-2">Password</label>
              <motion.div whileTap={{ scale: 0.995 }} className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                  style={{ color: focused === 'password' ? meta.color : '#5f6368' }}>
                  <Lock className="w-4 h-4" />
                </div>
                <input id="login-password" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                  placeholder="Enter your password" required
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-[13px] transition-all duration-200 focus:outline-none placeholder:text-[#5f6368]"
                  style={{
                    background: '#1e1f20',
                    border: `1.5px solid ${focused === 'password' ? meta.color : '#3c4043'}`,
                    color: '#e8eaed',
                    boxShadow: focused === 'password' ? `0 0 0 3px ${meta.color}15` : 'none',
                  }}
                />
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#5f6368] hover:text-[#9aa0a6] transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </motion.button>
              </motion.div>
            </div>

            {/* Forgot password link */}
<div className="text-right mt-2">
  <Link href="/forgot-password" className="text-sm text-[#8ab4f8] hover:underline">Forgot password?</Link>
</div>
{/* Submit */}
            <motion.button id="login-submit" type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01, boxShadow: `0 8px 25px ${meta.color}40` }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-[13px] font-semibold transition-all duration-300 flex items-center justify-center gap-2 mt-6 disabled:opacity-60 cursor-pointer"
              style={{ background: meta.color, color: '#131314', boxShadow: `0 4px 14px ${meta.color}30` }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? "Signing in..." : `Sign in as ${meta.label}`}
            </motion.button>

            {/* Google Login */}
            <div className="pt-2">
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 top-1/2 border-t" style={{ borderColor: '#3c4043' }} />
                <span className="relative z-10 px-3 text-[11px] text-[#5f6368] uppercase tracking-wider font-medium" style={{ background: '#131314' }}>
                  or continue with
                </span>
              </div>
              <div className="flex justify-center">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => toast.error("Google Login Failed")}
                  theme="filled_black" shape="pill" text="signin_with" width="100%" />
              </div>
            </div>
          </form>

          {/* Register link */}
          {role === "student" && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="mt-8 text-center text-[13px] text-[#5f6368]">
              New student?{" "}
              <Link href="/register" className="font-semibold hover:underline transition-colors" style={{ color: meta.color }}>
                Create an account
              </Link>
            </motion.p>
          )}
        </motion.div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex items-center justify-center min-h-screen" style={{ background: '#131314' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#8ab4f8' }} />
        </motion.div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
