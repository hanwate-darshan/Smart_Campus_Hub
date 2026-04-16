"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  History, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Image as ImageIcon,
  X,
  Send,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronUp,
  ShieldOff
} from "lucide-react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import api from "@/lib/api";
import useAuthStore from "@/store/auth.store";

const SOCKET_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/notifications`;

const CATEGORIES = [
  { value: "maintenance", label: "Maintenance" },
  { value: "hostel", label: "Hostel" },
  { value: "food", label: "Food" },
  { value: "wifi", label: "WiFi" },
  { value: "academic", label: "Academic" },
  { value: "ragging", label: "Ragging" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS = {
  submitted: "bg-slate-100 text-slate-600 border-slate-200",
  in_review: "bg-blue-50 text-blue-600 border-blue-100",
  in_progress: "bg-amber-50 text-amber-600 border-amber-100",
  resolved: "bg-emerald-50 text-emerald-600 border-emerald-100",
  closed: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export default function StudentComplaintsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("history"); // 'history' or 'new'
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "maintenance",
    description: "",
    isAnonymous: false,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const socketRef = useRef(null);

  // 1. Fetch Complaints
  const fetchComplaints = async () => {
    try {
      const { data } = await api.get("/api/complaints/mine");
      setComplaints(data.data);
    } catch (err) {
      toast.error("Failed to load your complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();

    // Socket Setup
    const token = localStorage.getItem("accessToken");
    socketRef.current = io(SOCKET_URL, { auth: { token } });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join", `user:${user._id}`);
    });

    socketRef.current.on("complaint_status_update", (payload) => {
      toast.success(`Complaint status updated: ${payload.newStatus.replace('_', ' ')}`, {
        icon: '🔔',
        duration: 5000
      });
      // Update local list
      setComplaints(prev => prev.map(c => 
        c._id === payload.complaintId ? { ...c, status: payload.newStatus } : c
      ));
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user._id]);

  // 2. Form Handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return toast.error("Max file size 5MB");
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.title.length < 5) return toast.error("Title too short");
    if (formData.description.length < 20) return toast.error("Description must be 20+ chars");

    setSubmitting(true);
    const data = new FormData();
    data.append("title", formData.title);
    data.append("category", formData.category);
    data.append("description", formData.description);
    data.append("isAnonymous", formData.isAnonymous);
    if (selectedFile) data.append("image", selectedFile);

    try {
      await api.post("/api/complaints", data);
      toast.success("Complaint submitted successfully!");
      setFormData({ title: "", category: "maintenance", description: "", isAnonymous: false });
      removeFile();
      setActiveTab("history");
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* --- HEADER & TABS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            Campus Complaints
          </h1>
          <p className="text-slate-500 font-medium mt-1">Report issues or track your submitted grievances</p>
        </div>

        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button 
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            <History className="w-4 h-4" /> My Complaints
          </button>
          <button 
            onClick={() => setActiveTab("new")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'new' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Plus className="w-4 h-4" /> New Complaint
          </button>
        </div>
      </div>

      {activeTab === "history" ? (
        /* --- LIST TAB --- */
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-400 font-bold">Loading your history...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 text-slate-300">
                <ShieldOff className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-700 dark:text-white">Nothing here yet!</h3>
              <p className="text-slate-400 mt-2 max-w-xs mx-auto">You haven't submitted any complaints. Use the "New Complaint" tab to report an issue.</p>
            </div>
          ) : (
            complaints.map((c) => (
              <div 
                key={c._id}
                className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 overflow-hidden transition-all hover:shadow-xl hover:shadow-blue-500/5 group"
              >
                <div 
                  className="p-6 md:p-8 cursor-pointer flex items-start justify-between gap-4"
                  onClick={() => setExpandedId(expandedId === c._id ? null : c._id)}
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                       <span className={`text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full border ${STATUS_COLORS[c.status] || STATUS_COLORS.submitted}`}>
                        {c.status.replace('_', ' ')}
                       </span>
                       <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full">
                        {c.category}
                       </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">
                      {c.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 font-bold">
                       <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(c.createdAt).toLocaleDateString()}</span>
                       <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {c.commentsCount || 0} Comments</span>
                    </div>
                  </div>
                  <div className="mt-1">
                    {expandedId === c._id ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}
                  </div>
                </div>

                {expandedId === c._id && (
                  <div className="px-6 pb-8 md:px-8 md:pb-10 animate-in slide-in-from-top-4 duration-300">
                    <div className="h-px bg-slate-50 dark:bg-slate-700/50 mb-6" />
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {c.description || "No description provided."}
                    </p>
                    {/* Full details like history/comments should be fetched or included in data */}
                    <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                       <p className="text-xs font-bold text-slate-400 italic">Expand view to see full resolution history and teacher comments in detail.</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* --- FORM TAB --- */
        <form 
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 p-8 md:p-12 shadow-sm space-y-8"
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest ml-1">Complaint Title</label>
              <input 
                required
                type="text"
                placeholder="Brief summary of the issue"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-white transition-all"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest ml-1">Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-white transition-all appearance-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest ml-1">Detailed Description</label>
            <textarea 
              required
              rows="5"
              placeholder="What happened? Please provide details to help us resolve it faster."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-white transition-all resize-none"
            />
            <p className="text-xs text-slate-400 font-bold text-right italic">(Minimum 20 characters)</p>
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest ml-1">Attach Image (Optional)</label>
            {!previewUrl ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                <div className="flex flex-col items-center justify-center p-5">
                   <ImageIcon className="w-10 h-10 text-slate-400 mb-2" />
                   <p className="text-sm text-slate-500 font-bold">Click to upload photo evidence</p>
                   <p className="text-xs text-slate-400 mt-1 uppercase tracking-tighter">JPG, PNG up to 5MB</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="relative w-full h-64 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-700">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={removeFile}
                  className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Anonymity */}
          <div className="flex items-center gap-4 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/30">
             <input 
               type="checkbox" 
               id="anon"
               checked={formData.isAnonymous}
               onChange={(e) => setFormData({...formData, isAnonymous: e.target.checked})}
               className="w-5 h-5 rounded-lg border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
             />
             <label htmlFor="anon" className="flex-1 cursor-pointer">
                <h4 className="font-black text-slate-800 dark:text-white mb-0.5">Anonymous Submission</h4>
                <p className="text-xs text-slate-500 font-medium">Your identity will be hidden from teachers. Only Admins can see your name for safety audits.</p>
             </label>
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-5 rounded-[2rem] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black text-xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            SUBMIT COMPLAINT
          </button>
        </form>
      )}
    </div>
  );
}
