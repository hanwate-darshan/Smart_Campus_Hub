"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ClipboardList, Search, Filter, AlertTriangle, X, 
  MessageCircle, Send, Loader2, CheckCircle, Clock, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import useAuthStore from "@/store/auth.store";

const CATEGORIES = [
  { id: "", label: "All Categories" },
  { id: "maintenance", label: "Maintenance", icon: "🔧" },
  { id: "hostel", label: "Hostel", icon: "🏠" },
  { id: "food", label: "Food", icon: "🍽️" },
  { id: "wifi", label: "WiFi/Internet", icon: "📶" },
  { id: "academic", label: "Academic", icon: "📚" },
  { id: "ragging", label: "Ragging", icon: "🚨" },
  { id: "other", label: "Other", icon: "📌" },
];

const STATUSES = [
  { id: "", label: "All Statuses" },
  { id: "submitted", label: "Submitted" },
  { id: "in_review", label: "In Review" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" }
];

const VALID_TRANSITIONS = {
  "submitted": ["in_review", "in_progress", "resolved", "closed"],
  "in_review": ["in_progress", "resolved", "closed"],
  "in_progress": ["resolved", "closed"],
  "resolved": ["closed"],
  "closed": []
};

const STATUS_BADGES = {
  submitted: "bg-blue-100 text-blue-700 border border-blue-200",
  in_review: "bg-amber-100 text-amber-700 border border-amber-200",
  in_progress: "bg-purple-100 text-purple-700 border border-purple-200",
  resolved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  closed: "bg-slate-100 text-slate-700 border border-slate-200"
};

export default function TeacherComplaintsPage() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalComplaints, setTotalComplaints] = useState(0);

  // Manage Modal
  const [selectedComp, setSelectedComp] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");
  const [replyText, setReplyText] = useState("");
  const [statusProfanityError, setStatusProfanityError] = useState("");
  const [replyProfanityError, setReplyProfanityError] = useState("");
  const [updating, setUpdating] = useState(false);

  // Urgent Banner
  const [urgentBanner, setUrgentBanner] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = getSocket("/notifications");
    
    if (socketRef.current) {
      socketRef.current.on("notification_push", (data) => {
        if (data.type === "new_complaint") {
          toast.success("New Complaint: " + data.message);
          fetchComplaints(1, true);
        } else if (data.type === "urgent_complaint") {
          setUrgentBanner(true);
          fetchComplaints(1, true);
        }
      });
    }

    return () => {
      if (socketRef.current) socketRef.current.off("notification_push");
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchComplaints(1, true);
    }, 500);
    return () => clearTimeout(timer);
  }, [categoryFilter, statusFilter, search]);

  const fetchComplaints = async (pageNum = 1, reset = false) => {
    try {
      if (reset) setLoading(true);
      const { data } = await api.get(`/api/complaints`, {
        params: {
          category: categoryFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
          page: pageNum,
          limit: 10
        }
      });
      if (reset) {
        setComplaints(data.data.complaints);
      } else {
        setComplaints(prev => [...prev, ...data.data.complaints]);
      }
      setHasMore(data.data.pagination.hasNextPage);
      setTotalComplaints(data.data.pagination.totalComplaints);
      setPage(pageNum);
    } catch (err) {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) return;
    setStatusProfanityError("");
    setUpdating(true);
    try {
      const { data } = await api.patch(`/api/complaints/${selectedComp._id}/status`, {
        status: newStatus,
        comment: statusComment
      });
      toast.success("Status updated");
      setSelectedComp(data.data);
      setStatusComment("");
      setNewStatus("");
      setComplaints(prev => prev.map(c => c._id === data.data._id ? data.data : c));
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error?.includes("inappropriate language")) {
        setStatusProfanityError(err.response.data.error);
      } else {
        toast.error(err.response?.data?.error || "Failed to update status");
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!replyText) return;
    setReplyProfanityError("");
    setUpdating(true);
    try {
      const { data } = await api.post(`/api/complaints/${selectedComp._id}/comment`, {
        text: replyText
      });
      toast.success("Response sent");
      setSelectedComp(data.data);
      setReplyText("");
      setComplaints(prev => prev.map(c => c._id === data.data._id ? data.data : c));
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error?.includes("inappropriate language")) {
        setReplyProfanityError(err.response.data.error);
      } else {
        toast.error(err.response?.data?.error || "Failed to add comment");
      }
    } finally {
      setUpdating(false);
    }
  };

  // Stats calculation from current view (approximate for demo)
  const stats = {
    submitted: complaints.filter(c => c.status === "submitted").length,
    in_progress: complaints.filter(c => c.status === "in_progress").length,
    escalated: complaints.filter(c => c.escalatedAt).length,
    resolvedToday: complaints.filter(c => c.status === "resolved" && new Date(c.updatedAt).toDateString() === new Date().toDateString()).length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-white">Complaint Management</h1>
        <p className="text-slate-500 font-medium mt-1">Review, manage, and resolve student complaints.</p>
      </div>

      {/* URGENT BANNER */}
      {urgentBanner && (
        <div className="bg-red-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-red-600/20 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <p className="font-bold">🚨 URGENT: Ragging complaint submitted. Immediate review required.</p>
          </div>
          <button onClick={() => setUrgentBanner(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Submitted", val: stats.submitted, color: "text-blue-600" },
          { label: "In Progress", val: stats.in_progress, color: "text-purple-600" },
          { label: "Escalated", val: stats.escalated, color: "text-red-600" },
          { label: "Resolved Today", val: stats.resolvedToday, color: "text-emerald-600" }
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center">
            <span className={`text-3xl font-black ${s.color}`}>{s.val}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</span>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search complaints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 outline-none"
        >
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 outline-none"
        >
          {STATUSES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      {/* COMPLAINT LIST */}
      <div className="space-y-4">
        {loading && page === 1 ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-800 dark:text-white">No complaints found</h3>
          </div>
        ) : (
          <>
            {complaints.map(comp => (
              <div key={comp._id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:border-blue-300 transition-all">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-md uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {CATEGORIES.find(c => c.id === comp.category)?.icon} {comp.category}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${STATUS_BADGES[comp.status]}`}>
                      {comp.status.replace("_", " ")}
                    </span>
                    {comp.escalatedAt && (
                      <span className="text-[10px] font-black px-2.5 py-1 bg-red-100 text-red-700 border border-red-200 rounded-md flex items-center gap-1 uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3" /> Escalated
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1 truncate">{comp.title}</h3>
                  <p className="text-xs text-slate-500 font-bold mb-2">
                    By: {comp.studentId?.name || "Unknown"} <span className="mx-2">•</span> {new Date(comp.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{comp.description}</p>
                </div>
                <div className="flex items-center justify-between w-full md:w-auto gap-4 shrink-0">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" /> {comp.comments?.length || 0}
                  </span>
                  <button 
                    onClick={() => {
                      setSelectedComp(comp);
                      setNewStatus("");
                      setStatusComment("");
                      setReplyText("");
                      setStatusProfanityError("");
                      setReplyProfanityError("");
                    }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white dark:bg-slate-700 dark:text-white font-bold rounded-xl transition-colors"
                  >
                    Manage →
                  </button>
                </div>
              </div>
            ))}
            {hasMore && (
              <button 
                onClick={() => fetchComplaints(page + 1)}
                className="w-full py-3 bg-white dark:bg-slate-800 text-blue-600 font-bold rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"
              >
                Load More
              </button>
            )}
          </>
        )}
      </div>

      {/* MANAGE MODAL (SLIDE IN) */}
      {selectedComp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Manage Complaint</h2>
              <button onClick={() => setSelectedComp(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* SECTION 1: Full details */}
              <div className="space-y-4">
                <div className="flex gap-2 mb-2">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${STATUS_BADGES[selectedComp.status]}`}>
                    {selectedComp.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{selectedComp.title}</h3>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                   <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                     {selectedComp.studentId?.name?.charAt(0) || "U"}
                   </div>
                   <div>
                     <p className="text-slate-800 dark:text-white">{selectedComp.studentId?.name || "Unknown"}</p>
                     <p className="text-xs text-slate-400 font-medium">{new Date(selectedComp.createdAt).toLocaleString()}</p>
                   </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</h4>
                  <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">{selectedComp.description}</p>
                  {selectedComp.imageUrl && (
                    <img src={selectedComp.imageUrl} alt="Complaint" className="mt-4 rounded-xl max-h-60 object-contain bg-white dark:bg-slate-900 p-2 border border-slate-100 dark:border-slate-700" />
                  )}
                </div>
              </div>

              {/* SECTION 3: Update Status */}
              {VALID_TRANSITIONS[selectedComp.status]?.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                  <h4 className="text-sm font-black text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Update Status
                  </h4>
                  <div className="space-y-4">
                    <select 
                      value={newStatus} 
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Next Status...</option>
                      {VALID_TRANSITIONS[selectedComp.status].map(s => (
                        <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>
                      ))}
                    </select>
                    
                    <div>
                      <textarea 
                        maxLength={500}
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        placeholder="Optional internal/public note about this status change..."
                        className="w-full min-h-[80px] bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] font-bold text-slate-400">{statusComment.length}/500</span>
                      </div>
                      
                      {/* ADD-ON 2 PROFANITY ERROR */}
                      {statusProfanityError && (
                        <div className="mt-2 bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs font-bold flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" /> {statusProfanityError}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={handleUpdateStatus}
                      disabled={!newStatus || updating}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black rounded-xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2"
                    >
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Update
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 4: Add Comment */}
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white mb-3">Add Response</h4>
                <div className="space-y-3">
                  <textarea 
                    maxLength={500}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a response to the student..."
                    className="w-full min-h-[100px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                  
                  {/* ADD-ON 2 PROFANITY ERROR */}
                  {replyProfanityError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs font-bold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {replyProfanityError}
                    </div>
                  )}

                  <button 
                    onClick={handleAddComment}
                    disabled={!replyText || updating}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2 ml-auto"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Response
                  </button>
                </div>
              </div>

              {/* SECTION 2: Activity Timeline */}
              {selectedComp.comments?.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Activity Timeline</h4>
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                    {selectedComp.comments.map((comment, idx) => (
                      <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-blue-100 text-blue-600 font-bold text-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                           {comment.authorName?.charAt(0) || "U"}
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">{comment.authorName}</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md font-bold uppercase">{comment.authorRole}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{comment.text}</p>
                          <span className="text-[10px] font-bold text-slate-400 mt-2 block">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
