"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { User, Mail, Lock, Eye, EyeOff, Phone, Upload, ArrowLeft, CheckCircle2, Loader2, AlertTriangle, FileText, X, Sparkles } from "lucide-react";

function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  if (score <= 2) return { label: "Weak", color: "#f28b82", pct: 33 };
  if (score <= 3) return { label: "Medium", color: "#fdd663", pct: 66 };
  return { label: "Strong", color: "#81c995", pct: 100 };
}

const accent = '#8ab4f8';

export default function RegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", phone: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState(null);
  const [step, setStep] = useState(1); // 1 = personal, 2 = security, 3 = upload

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setApiError("");
  };

  const handleFile = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(selected.type)) { setErrors(p => ({ ...p, idProof: "Only JPG, PNG or PDF" })); return; }
    if (selected.size > 5 * 1024 * 1024) { setErrors(p => ({ ...p, idProof: "Max 5MB" })); return; }
    setFile(selected); setErrors(p => ({ ...p, idProof: "" }));
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(selected);
    } else { setPreview(null); }
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.email.trim()) errs.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email";
    if (!form.phone) errs.phone = "Required";
    else if (!/^[0-9]{10}$/.test(form.phone)) errs.phone = "Must be 10 digits";
    return errs;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!form.password) errs.password = "Required";
    else if (form.password.length < 8) errs.password = "Min 8 characters";
    else if (!/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(form.password)) errs.password = "Need 1 uppercase, 1 number, 1 special";
    if (form.confirmPassword !== form.password) errs.confirmPassword = "Passwords don't match";
    return errs;
  };

  const nextStep = () => {
    if (step === 1) {
      const errs = validateStep1();
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    if (step === 2) {
      const errs = validateStep2();
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    setStep(s => Math.min(s + 1, 3));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setErrors({ idProof: "ID proof required" }); return; }
    setLoading(true); setApiError("");
    const fd = new FormData();
    Object.keys(form).forEach(k => fd.append(k, form[k]));
    fd.append("idProof", file);
    try {
      await api.post("/api/auth/register", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Registration failed";
      setApiError(err.response ? msg : "Network error");
    } finally { setLoading(false); }
  };

  const strength = getPasswordStrength(form.password);
  const steps = [
    { num: 1, label: "Personal" },
    { num: 2, label: "Security" },
    { num: 3, label: "Verify" },
  ];

  /* ── SUCCESS ── */
  if (success) {
    return (
      <main className="flex items-center justify-center min-h-screen px-4" style={{ background: '#131314' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: "spring" }}
          className="w-full max-w-sm rounded-2xl p-8 text-center" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: '#1b3a1b' }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: '#81c995' }} />
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-xl font-bold text-[#81c995] mb-2">Registration Submitted!</motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="text-[13px] text-[#9aa0a6] mb-6 leading-relaxed">
            Your account is under review. Admin will verify your ID proof and approve your account. You'll be notified once approved.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Link href="/login?role=student"
              className="inline-flex items-center justify-center w-full py-3 rounded-xl text-[13px] font-semibold transition-all"
              style={{ background: '#81c995', color: '#131314' }}>
              Go to Login
            </Link>
          </motion.div>
        </motion.div>
      </main>
    );
  }

  const inputCls = (name) => ({
    background: '#1e1f20',
    border: `1.5px solid ${errors[name] ? '#f28b82' : focused === name ? accent : '#3c4043'}`,
    color: '#e8eaed',
    boxShadow: focused === name ? `0 0 0 3px ${accent}15` : errors[name] ? `0 0 0 3px #f28b8215` : 'none',
  });

  return (
    <main className="flex min-h-screen" style={{ background: '#131314' }}>
      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse at 30% 20%, ${accent}25 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, ${accent}15 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, #c58af910 0%, transparent 60%),
            linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)
          `
        }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
        <motion.div animate={{ y: [0, -20, 0], x: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-3xl" style={{ background: `${accent}20` }} />
        <motion.div animate={{ y: [0, 15, 0], x: [0, -12, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full blur-3xl" style={{ background: `${accent}15` }} />

        <div className="relative z-10 max-w-sm px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-8">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded-xl" />
              <span className="text-lg font-bold text-white/90">Smart Campus Hub</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
              Join your<br /><span style={{ color: accent }}>Campus Community</span>
            </h2>
            <p className="text-[14px] text-white/40 leading-relaxed">
              Create your student account and get access to the complete campus ecosystem — marketplace, complaints, roommate finder, and more.
            </p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-wrap gap-2 mt-8">
              {["Verified Accounts", "Secure Platform", "Instant Access"].map((f, i) => (
                <motion.span key={f} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.1 }}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium border"
                  style={{ background: `${accent}08`, color: `${accent}cc`, borderColor: `${accent}20` }}>
                  {f}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }} className="w-full max-w-md">

          <motion.div whileHover={{ x: -3 }} className="inline-block mb-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[#5f6368] hover:text-[#8ab4f8] transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Back to home
            </Link>
          </motion.div>

          <div className="lg:hidden flex items-center gap-2.5 mb-4">
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="rounded-xl" />
            <span className="text-[14px] font-bold text-[#e8eaed]">Smart Campus Hub</span>
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-bold text-[#e8eaed] flex items-center gap-2">
              <span className="text-xl">🎓</span> Student Registration
            </h1>
            <p className="text-[12px] text-[#5f6368] mt-1">Create your account — admin will review and approve it</p>
          </div>

          {/* ── Step indicator ── */}
          <div className="flex items-center gap-2 mb-7">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2 flex-1">
                <motion.div animate={{ scale: step === s.num ? 1.1 : 1 }}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all duration-300`}
                  style={{
                    background: step >= s.num ? accent : '#282a2c',
                    color: step >= s.num ? '#131314' : '#5f6368',
                    boxShadow: step === s.num ? `0 0 12px ${accent}40` : 'none',
                  }}>
                  {step > s.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                </motion.div>
                <span className="text-[11px] font-medium hidden sm:block" style={{ color: step >= s.num ? '#e8eaed' : '#5f6368' }}>{s.label}</span>
                {i < steps.length - 1 && <div className="flex-1 h-px mx-1" style={{ background: step > s.num ? accent : '#3c4043' }} />}
              </div>
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {apiError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                <div className="flex items-start gap-2 p-3 rounded-xl text-[12px]" style={{ background: '#2c1515', border: '1px solid #5c2020', color: '#f28b82' }}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{apiError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {/* ── STEP 1: Personal ── */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                  className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-2">Full Name</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focused === 'name' ? accent : '#5f6368' }}><User className="w-4 h-4" /></div>
                      <input name="name" type="text" value={form.name} onChange={handleChange} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                        placeholder="Enter your full name" className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] transition-all duration-200 focus:outline-none placeholder:text-[#5f6368]" style={inputCls('name')} />
                    </div>
                    {errors.name && <p className="mt-1 text-[11px] text-[#f28b82] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-2">College Email</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focused === 'email' ? accent : '#5f6368' }}><Mail className="w-4 h-4" /></div>
                      <input name="email" type="email" value={form.email} onChange={handleChange} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                        placeholder="Enter your college email" className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] transition-all duration-200 focus:outline-none placeholder:text-[#5f6368]" style={inputCls('email')} />
                    </div>
                    {errors.email && <p className="mt-1 text-[11px] text-[#f28b82] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-2">Phone Number</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focused === 'phone' ? accent : '#5f6368' }}><Phone className="w-4 h-4" /></div>
                      <input name="phone" type="tel" value={form.phone} onChange={handleChange} onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                        placeholder="Enter your 10-digit number" className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] transition-all duration-200 focus:outline-none placeholder:text-[#5f6368]" style={inputCls('phone')} />
                    </div>
                    {errors.phone && <p className="mt-1 text-[11px] text-[#f28b82] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.phone}</p>}
                  </div>

                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="button" onClick={nextStep}
                    className="w-full py-3 rounded-xl text-[13px] font-semibold mt-4 transition-all cursor-pointer"
                    style={{ background: accent, color: '#131314', boxShadow: `0 4px 14px ${accent}25` }}>
                    Continue →
                  </motion.button>
                </motion.div>
              )}

              {/* ── STEP 2: Security ── */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                  className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focused === 'password' ? accent : '#5f6368' }}><Lock className="w-4 h-4" /></div>
                      <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange}
                        onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                        placeholder="Min 8 chars, 1 upper, 1 number, 1 special"
                        className="w-full pl-10 pr-12 py-3 rounded-xl text-[13px] transition-all duration-200 focus:outline-none placeholder:text-[#5f6368]" style={inputCls('password')} />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#5f6368] hover:text-[#9aa0a6]">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </motion.button>
                    </div>
                    {form.password.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#282a2c' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${strength.pct}%` }} transition={{ duration: 0.4 }}
                            className="h-full rounded-full" style={{ background: strength.color }} />
                        </div>
                        <span className="text-[11px] font-semibold" style={{ color: strength.color }}>{strength.label}</span>
                      </div>
                    )}
                    {errors.password && <p className="mt-1 text-[11px] text-[#f28b82] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-2">Confirm Password</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focused === 'confirmPassword' ? accent : '#5f6368' }}><Lock className="w-4 h-4" /></div>
                      <input name="confirmPassword" type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={handleChange}
                        onFocus={() => setFocused('confirmPassword')} onBlur={() => setFocused(null)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-12 py-3 rounded-xl text-[13px] transition-all duration-200 focus:outline-none placeholder:text-[#5f6368]" style={inputCls('confirmPassword')} />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#5f6368] hover:text-[#9aa0a6]">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </motion.button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-[11px] text-[#f28b82] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.confirmPassword}</p>}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => setStep(1)}
                      className="px-5 py-3 rounded-xl text-[13px] font-medium text-[#9aa0a6] hover:bg-[#1e1f20] transition-colors">
                      ← Back
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="button" onClick={nextStep}
                      className="flex-1 py-3 rounded-xl text-[13px] font-semibold transition-all cursor-pointer"
                      style={{ background: accent, color: '#131314', boxShadow: `0 4px 14px ${accent}25` }}>
                      Continue →
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3: Upload & Submit ── */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                  className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-2">College ID Proof</label>
                    <motion.div whileHover={{ borderColor: accent, boxShadow: `0 0 0 3px ${accent}10` }} whileTap={{ scale: 0.99 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-8 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all duration-200"
                      style={{ borderColor: errors.idProof ? '#f28b82' : '#3c4043', background: '#1e1f20' }}>
                      {file ? (
                        <div className="flex flex-col items-center gap-2">
                          {preview ? (
                            <img src={preview} alt="Preview" className="h-20 rounded-lg object-contain" style={{ border: '1px solid #3c4043' }} />
                          ) : (
                            <FileText className="w-10 h-10" style={{ color: accent }} />
                          )}
                          <p className="text-[13px] text-[#e8eaed] font-medium">{file.name}</p>
                          <p className="text-[11px] text-[#5f6368]">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${accent}15` }}>
                            <Upload className="w-5 h-5" style={{ color: accent }} />
                          </div>
                          <p className="text-[13px] text-[#9aa0a6]">Click to upload your College ID</p>
                          <p className="text-[11px] text-[#5f6368]">JPG, PNG or PDF • Max 5MB</p>
                        </div>
                      )}
                    </motion.div>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleFile} className="hidden" />
                    {errors.idProof && <p className="mt-1 text-[11px] text-[#f28b82] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.idProof}</p>}
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl p-4 space-y-2" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
                    <p className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider mb-2">Review your details</p>
                    {[
                      { l: "Name", v: form.name }, { l: "Email", v: form.email }, { l: "Phone", v: form.phone },
                    ].map(r => (
                      <div key={r.l} className="flex justify-between text-[12px] py-1">
                        <span className="text-[#5f6368]">{r.l}</span>
                        <span className="text-[#e8eaed] font-medium">{r.v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => setStep(2)}
                      className="px-5 py-3 rounded-xl text-[13px] font-medium text-[#9aa0a6] hover:bg-[#1e1f20] transition-colors">
                      ← Back
                    </motion.button>
                    <motion.button whileHover={{ scale: loading ? 1 : 1.01, boxShadow: `0 8px 25px ${accent}30` }} whileTap={{ scale: 0.98 }}
                      type="submit" disabled={loading}
                      className="flex-1 py-3 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: accent, color: '#131314', boxShadow: `0 4px 14px ${accent}25` }}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {loading ? "Submitting..." : "Submit for Approval"}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-8 text-center text-[13px] text-[#5f6368]">
            Already have an account?{" "}
            <Link href="/login?role=student" className="font-semibold hover:underline" style={{ color: accent }}>Sign in</Link>
          </motion.p>
        </motion.div>
      </div>
    </main>
  );
}
