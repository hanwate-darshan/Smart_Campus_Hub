"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import useAuthStore from "@/store/auth.store";
import { Camera, Check, X, Save, Edit3, Mail, Phone, Calendar, Shield, BookOpen, GraduationCap, User, LogOut, Sparkles } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ProfilePage({ role, apiEndpoint, editableFields = [] }) {
  const { user, updateUser, clearAuth } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const { data } = await axios.get(`${API_BASE}${apiEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) { setProfile(data.data); resetForm(data.data); }
    } catch { toast.error("Failed to load profile"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const resetForm = (d) => {
    const fd = {};
    editableFields.forEach(f => { fd[f.key] = d[f.key] || ""; });
    setFormData(fd);
    setPreviewImage(d.profilePicUrl || null);
    setSelectedFile(null);
  };

  const handleCancel = () => { setEditMode(false); if (profile) resetForm(profile); };
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const form = new FormData();
      Object.keys(formData).forEach(k => { if (formData[k]) form.append(k, formData[k]); });
      if (selectedFile) form.append("profilePic", selectedFile);
      const { data } = await axios.patch(`${API_BASE}${apiEndpoint}`, form, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      if (data.success) {
        toast.success("Profile updated!");
        setProfile(data.data); setEditMode(false);
        updateUser({ name: data.data.name, profilePicUrl: data.data.profilePicUrl });
      }
    } catch (err) { toast.error(err.response?.data?.error || "Update failed"); }
    finally { setSaving(false); }
  };

  const handleLogout = () => { clearAuth(); if (typeof window !== "undefined") window.location.href = "/"; };

  const accentMap = { student: '#8ab4f8', teacher: '#81c995', admin: '#c58af9', security: '#f28b82' };
  const accent = accentMap[role] || '#8ab4f8';
  const initial = profile?.name?.charAt(0)?.toUpperCase() || "U";
  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return "N/A"; } };

  const iconMap = {
    name: <User className="w-4 h-4" />, phone: <Phone className="w-4 h-4" />,
    department: <BookOpen className="w-4 h-4" />, year: <GraduationCap className="w-4 h-4" />,
    bio: <Sparkles className="w-4 h-4" />,
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: accent, borderTopColor: 'transparent' }} />
          <p className="text-[12px] text-[#5f6368]">Loading profile...</p>
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#282a2c] text-[#f28b82]">
            <X className="w-6 h-6" />
          </div>
          <p className="text-[#e8eaed] font-medium">Failed to load profile data</p>
          <p className="text-[12px] text-[#9aa0a6] max-w-xs">There was an issue fetching your profile information. This usually happens if your session has expired.</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl text-[12px] font-medium bg-[#1e1f20] border border-[#3c4043] text-[#e8eaed] hover:bg-[#282a2c] transition-colors">
              Retry
            </button>
            <button onClick={handleLogout} className="px-4 py-2 rounded-xl text-[12px] font-medium transition-all duration-300 cursor-pointer hover:opacity-80"
              style={{ background: accent, color: '#131314' }}>
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-4xl mx-auto pb-8">

      {/* ═══════════ HERO BANNER ═══════════ */}
      <div className="relative rounded-2xl overflow-hidden mb-6" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
        {/* Mesh gradient cover */}
        <div className="h-44 relative overflow-hidden">
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse at 20% 50%, ${accent}30 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, ${accent}20 0%, transparent 50%),
              radial-gradient(ellipse at 50% 80%, #c58af920 0%, transparent 50%),
              linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)
            `
          }} />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
          {/* Floating orbs */}
          <div className="absolute top-8 right-16 w-16 h-16 rounded-full blur-xl animate-pulse-slow" style={{ background: `${accent}25` }} />
          <div className="absolute bottom-4 left-24 w-24 h-24 rounded-full blur-2xl animate-pulse-slow-delay" style={{ background: `${accent}15` }} />
        </div>

        {/* Avatar + Name bar */}
        <div className="relative px-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-[#1e1f20] relative"
                style={{ background: '#282a2c' }}>
                {previewImage ? (
                  <Image 
                    src={previewImage} 
                    alt="Profile" 
                    fill 
                    sizes="96px"
                    className="object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ color: accent, background: `${accent}15` }}>
                    {initial}
                  </div>
                )}
              </div>
              {editMode && (
                <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-2 rounded-xl shadow-lg border transition-all hover:scale-110"
                  style={{ background: '#1e1f20', borderColor: '#3c4043', color: accent }}>
                  <Camera className="w-3.5 h-3.5" />
                </motion.button>
              )}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-[#e8eaed] truncate">{profile.name}</h1>
                {profile.status === "approved" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: '#1b3a1b', color: '#81c995' }}>
                    <Check className="w-3 h-3" /> Verified
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider capitalize"
                  style={{ background: `${accent}20`, color: accent }}>
                  {role}
                </span>
              </div>
              <p className="text-[13px] text-[#9aa0a6] mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {profile.email}
              </p>
            </div>

            {/* Action button */}
            <div className="sm:pb-1">
              {!editMode ? (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setEditMode(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
                  style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </motion.button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleCancel} className="p-2 rounded-xl text-[#9aa0a6] hover:bg-[#282a2c] transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ TABS ═══════════ */}
      <div className="flex items-center gap-1 mb-5 px-1">
        {["overview", "settings"].map(tab => (
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
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* ── Left: Info Card ── */}
            <div className="lg:col-span-2 space-y-4">
              {!editMode ? (
                <>
                  {/* Personal Info */}
                  <div className="rounded-xl p-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-[13px] font-semibold text-[#e8eaed]">Personal Information</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {editableFields.filter(f => f.key !== 'bio').map(f => (
                        <div key={f.key} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-[#282a2c]/50" style={{ background: '#282a2c' }}>
                          <div className="text-[#5f6368]">{iconMap[f.key] || <User className="w-4 h-4" />}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-[#5f6368] uppercase tracking-wider font-medium">{f.label}</p>
                            <p className="text-[13px] text-[#e8eaed] font-medium truncate mt-0.5">
                              {profile[f.key] ? (f.key === 'year' ? `${profile[f.key]} Year` : profile[f.key]) : <span className="text-[#5f6368] italic">Not set</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bio card */}
                  {editableFields.find(f => f.key === 'bio') && (
                    <div className="rounded-xl p-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-[13px] font-semibold text-[#e8eaed]">About</h3>
                      </div>
                      <p className="text-[13px] text-[#9aa0a6] leading-relaxed pl-9">
                        {profile.bio ? `"${profile.bio}"` : <span className="italic text-[#5f6368]">No bio added yet. Click edit to add one.</span>}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* ══ EDIT FORM ══ */
                <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSubmit}
                  className="rounded-xl p-5 space-y-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
                  <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid #3c4043' }}>
                    <Edit3 className="w-4 h-4" style={{ color: accent }} />
                    <h3 className="text-[13px] font-semibold text-[#e8eaed]">Edit your information</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {editableFields.filter(f => f.type !== 'textarea').map(f => (
                      <div key={f.key} className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider">
                          {iconMap[f.key]} {f.label}
                        </label>
                        {f.type === 'select' ? (
                          <select name={f.key} value={formData[f.key] || ""} onChange={handleChange}
                            className="w-full px-3 py-2.5 rounded-xl text-[13px] focus:outline-none transition-all cursor-pointer"
                            style={{ background: '#282a2c', border: '1px solid #3c4043', color: '#e8eaed' }}>
                            <option value="">Select {f.label}</option>
                            {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type={f.type || "text"} name={f.key} value={formData[f.key] || ""} onChange={handleChange}
                            placeholder={f.placeholder}
                            className="w-full px-3 py-2.5 rounded-xl text-[13px] focus:outline-none transition-all placeholder:text-[#5f6368]"
                            style={{ background: '#282a2c', border: '1px solid #3c4043', color: '#e8eaed' }} />
                        )}
                      </div>
                    ))}
                  </div>

                  {editableFields.find(f => f.type === 'textarea') && (() => {
                    const f = editableFields.find(f => f.type === 'textarea');
                    return (
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5" /> {f.label}
                        </label>
                        <textarea name={f.key} value={formData[f.key] || ""} onChange={handleChange}
                          placeholder={f.placeholder} maxLength={200}
                          className="w-full px-3 py-3 rounded-xl text-[13px] min-h-[100px] resize-none focus:outline-none transition-all placeholder:text-[#5f6368]"
                          style={{ background: '#282a2c', border: '1px solid #3c4043', color: '#e8eaed' }} />
                        <p className="text-[10px] text-[#5f6368] text-right">{(formData[f.key] || "").length}/200</p>
                      </div>
                    );
                  })()}

                  <div className="flex justify-end gap-2 pt-2">
                    <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={handleCancel}
                      className="px-4 py-2.5 rounded-xl text-[12px] font-medium text-[#9aa0a6] hover:bg-[#282a2c] transition-colors">
                      Cancel
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} type="submit" disabled={saving}
                      className="px-5 py-2.5 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
                      style={{ background: accent, color: '#131314', boxShadow: `0 4px 14px ${accent}40` }}>
                      {saving ? <div className="h-3.5 w-3.5 border-2 border-current rounded-full border-t-transparent animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? "Saving..." : "Save Changes"}
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </div>

            {/* ── Right: Sidebar Stats ── */}
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="rounded-xl p-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
                <h3 className="text-[12px] font-semibold text-[#5f6368] uppercase tracking-wider mb-4">Account Details</h3>
                <div className="space-y-3">
                  {[
                    { icon: <Mail className="w-4 h-4" />, label: "Email", value: profile.email },
                    { icon: <Shield className="w-4 h-4" />, label: "Role", value: role, isAccent: true },
                    { icon: <Calendar className="w-4 h-4" />, label: "Joined", value: fmtDate(profile.createdAt) },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-[#5f6368]">{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[#5f6368] uppercase tracking-wider">{item.label}</p>
                        <p className={`text-[13px] font-medium truncate mt-0.5 capitalize ${item.isAccent ? '' : 'text-[#e8eaed]'}`}
                          style={item.isAccent ? { color: accent } : {}}>
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status badge */}
              <div className="rounded-xl p-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
                <h3 className="text-[12px] font-semibold text-[#5f6368] uppercase tracking-wider mb-3">Status</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full" style={{ background: profile.status === 'approved' ? '#81c995' : '#fdd663' }} />
                    <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-30" style={{ background: profile.status === 'approved' ? '#81c995' : '#fdd663' }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold capitalize" style={{ color: profile.status === 'approved' ? '#81c995' : '#fdd663' }}>
                      {profile.status}
                    </p>
                    <p className="text-[11px] text-[#5f6368]">
                      {profile.status === 'approved' ? 'Your account is fully verified' : 'Awaiting admin verification'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile completeness */}
              <div className="rounded-xl p-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
                <h3 className="text-[12px] font-semibold text-[#5f6368] uppercase tracking-wider mb-3">Profile Completeness</h3>
                {(() => {
                  const total = editableFields.length;
                  const filled = editableFields.filter(f => profile[f.key]).length;
                  const pct = total > 0 ? Math.round((filled / total) * 100) : 100;
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[22px] font-bold text-[#e8eaed]">{pct}%</span>
                        <span className="text-[11px] text-[#5f6368]">{filled}/{total} fields</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#282a2c' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                          className="h-full rounded-full" style={{ background: pct === 100 ? '#81c995' : accent }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="space-y-4">
            {/* Session Info */}
            <div className="rounded-xl p-5" style={{ background: '#1e1f20', border: '1px solid #3c4043' }}>
              <h3 className="text-[13px] font-semibold text-[#e8eaed] mb-1">Active Sessions</h3>
              <p className="text-[12px] text-[#5f6368] mb-4">Manage your active login sessions.</p>
              <div className="flex items-center gap-4 px-4 py-3 rounded-xl" style={{ background: '#282a2c' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-[#e8eaed]">Current Browser</p>
                  <p className="text-[11px] text-[#5f6368]">Active now • {typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').pop()?.split('/')[0] : 'Browser'}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#81c995]" />
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
                <p className="text-[12px] text-[#9aa0a6] mb-4">Logging out will clear your session data. You will need to enter your credentials again to access the platform.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-300 cursor-pointer hover:opacity-80"
                    style={{ background: accent, color: '#131314' }}>
                    <LogOut className="w-3.5 h-3.5" /> Logout from this device
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
