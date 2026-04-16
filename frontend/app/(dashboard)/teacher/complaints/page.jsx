"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Filter, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Eye,
  User,
  Shield,
  ArrowRight,
  Loader2,
  Calendar,
  X,
  History,
  Send,
  Flag
} from "lucide-react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import api from "@/lib/api";
import useAuthStore from "@/store/auth.store";

const SOCKET_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/notifications`;

const CATEGORIES = ["maintenance", "hostel", "food", "wifi", "academic", "ragging", "other"];
const STATUSES = ["submitted", "in_review", "in_progress", "resolved", "closed"];

const STATUS_COLORS = {
  submitted: "bg-slate-100 text-slate-600 border-slate-200",
  in_review: "bg-blue-50 text-blue-600 border-blue-100",
  in_progress: "bg-amber-50 text-amber-600 border-amber-100",
  resolved: "bg-emerald-50 text-emerald-600 border-emerald-100",
  closed: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export default function TeacherComplaintsPage() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [filters, setFilters] = useState({ category: "", status: "", search: "" });
  
  // Status Update State
  const [newStatus, setNewStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");
  const [updating, setUpdating] = useState(false);

  const socketRef = useRef(null);

  // 1. Fetch Data
  const fetchComplaints = async () => {
    try {
      const { category, status, search } = filters;
      let url = `/api/complaints?limit=50`;
      if (category) url += `&category=${category}`;
      if (status) url += `&status=${status}`;
      if (search) url += `&search=${search}`;
      
      const { data } = await api.get(url);
      setComplaints(data.data);
    } catch (err) {
      toast.error("Failed to load complaints");
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
      socketRef.current.emit("join", "security:pool"); // Using a generic pool or room
    });

    socketRef.current.on("new_complaint", (payload) => {
      toast.success(`New Complaint: ${payload.title}`, {
        duration: 8000,
        icon: '📝'
      });
      fetchComplaints(); // Refresh list
    });

    socketRef.current.on("urgent_complaint", (payload) => {
      toast.error(`URGENT: ${payload.message}`, {
         duration: 10000,
         style: { background: '#ef4444', color: '#fff' }
      });
      fetchComplaints();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [filters]);

  // 2. Action Handlers
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!newStatus) return toast.error("Please select a new status");
    setUpdating(true);
    try {
      await api.patch(`/api/complaints/${selectedComplaint._id}/status`, {
        status: newStatus,
        comment: statusComment
      });
      toast.success("Status updated successfully");
      setNewStatus("");
      setStatusComment("");
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  // 3. Render Helpers
  const isEscalated = (createdAt) => {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    return new Date(createdAt) < fortyEightHoursAgo;
  };

  return (
    <div className="space-y-8 pb-10">
      {/* --- HEADER & FILTERS --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Manage Complaints</h1>
          <p className="text-slate-500 font-medium">Review and resolve campus student issues</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..."
              className="pl-11 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-bold text-sm w-48 focus:ring-2 focus:ring-blue-500 transition-all"
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <select 
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* --- LIST --- */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-[2rem]">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {complaints.map((c) => (
            <div 
              key={c._id}
              onClick={() => setSelectedComplaint(c)}
              className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
            >
              {/* Escalation Warning Bar */}
              {isEscalated(c.createdAt) && c.status === 'submitted' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
              )}

              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full border ${STATUS_COLORS[c.status]}`}>
                  {c.status.replace('_', ' ')}
                </span>
                {isEscalated(c.createdAt) && c.status === 'submitted' && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-full animate-bounce">
                    <AlertCircle className="w-3 h-3" /> ESCALATED
                  </span>
                )}
              </div>

              <h3 className="text-lg font-black text-slate-800 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                {c.title}
              </h3>

              <div className="flex flex-col gap-3 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <User className="w-3 h-3" /> 
                  <span className={c.isAnonymous ? "text-blue-500 italic" : ""}>
                    {c.isAnonymous ? "Anonymous Student" : c.studentName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Clock className="w-3 h-3" /> {new Date(c.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Flag className="w-3 h-3" /> {c.category}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-50 dark:border-slate-700 pt-4">
                 <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                    <MessageSquare className="w-3 h-3" /> {c.comments?.length || 0}
                 </div>
                 <span className="text-blue-600 text-xs font-black flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    VIEW DETAILS <ArrowRight className="w-3 h-3" />
                 </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- DETAIL MODAL --- */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-800 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
               <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${STATUS_COLORS[selectedComplaint.status]}`}>
                      {selectedComplaint.status.toUpperCase()}
                    </span>
                    {selectedComplaint.isAnonymous && (
                      <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full border border-blue-200">ANONYMOUS</span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white line-clamp-1">{selectedComplaint.title}</h2>
               </div>
               <button onClick={() => setSelectedComplaint(null)} className="p-3 bg-white dark:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 transition-colors shadow-sm">
                 <X className="w-6 h-6" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
               {/* 1. Description & Info */}
               <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="md:col-span-2 space-y-4">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</h4>
                     <p className="text-slate-600 dark:text-white font-medium leading-relaxed">
                        {selectedComplaint.description}
                     </p>
                     
                     {selectedComplaint.imageUrl && (
                       <div className="mt-6 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-lg group">
                          <img src={selectedComplaint.imageUrl} alt="Proof" className="w-full object-cover max-h-96" />
                          <div className="p-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold text-center">
                             Evidence Attachment
                          </div>
                       </div>
                     )}
                  </div>

                  <div className="space-y-6">
                     <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Reporter Details</h4>
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                              {selectedComplaint.isAnonymous ? <Shield className="w-6 h-6" /> : <User className="w-6 h-6" />}
                           </div>
                           <div>
                              <p className="font-black text-slate-800 dark:text-white">{selectedComplaint.isAnonymous ? "Identity Hidden" : selectedComplaint.studentName}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedComplaint.isAnonymous ? "Protective Privacy" : "verified student"}</p>
                           </div>
                        </div>
                     </div>

                     <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Metadata</h4>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-400">Category</span>
                              <span className="text-slate-800 dark:text-white capitalize">{selectedComplaint.category}</span>
                           </div>
                           <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-400">Created At</span>
                              <span className="text-slate-800 dark:text-white">{new Date(selectedComplaint.createdAt).toLocaleDateString()}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </section>

               {/* 2. Action Flow */}
               <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-inner">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <History className="w-4 h-4" /> Timeline & Actions
                  </h4>
                  
                  {/* Timeline */}
                  <div className="space-y-6 mb-10">
                     {selectedComplaint.comments?.map((comment, i) => (
                        <div key={i} className="flex gap-4">
                           <div className="relative">
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                              {i !== selectedComplaint.comments.length - 1 && <div className="absolute top-4 bottom-[-1.5rem] left-[3px] w-px bg-slate-100 dark:bg-slate-700" />}
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-tighter">{comment.authorRole}</span>
                                 <span className="text-[10px] text-slate-400 font-bold italic">{new Date(comment.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-sm font-medium text-slate-600 dark:text-white bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl rounded-tl-none inline-block">
                                 {comment.text}
                              </p>
                           </div>
                        </div>
                     ))}
                  </div>

                  {/* Update Form */}
                  <form onSubmit={handleUpdateStatus} className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-4">
                        <select 
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Move to Status...</option>
                          {STATUSES.map(s => (
                             <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                          ))}
                        </select>
                        <input 
                          type="text" 
                          placeholder="Note for this update (optional)..."
                          value={statusComment}
                          onChange={(e) => setStatusComment(e.target.value)}
                          className="px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                     <button 
                        disabled={updating}
                        className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                     >
                        {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        UPDATE COMPLAINT STATUS
                     </button>
                  </form>
               </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
