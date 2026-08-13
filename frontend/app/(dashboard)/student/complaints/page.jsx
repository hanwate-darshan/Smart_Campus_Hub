"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ClipboardList, PlusCircle, AlertCircle, Upload, Info, 
  MessageCircle, X, CheckCircle, Loader2, Image as ImageIcon,
  AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import useAuthStore from "@/store/auth.store";

const CATEGORIES = [
  { id: "maintenance", label: "Maintenance", icon: "🔧" },
  { id: "hostel", label: "Hostel", icon: "🏠" },
  { id: "food", label: "Food", icon: "🍽️" },
  { id: "wifi", label: "WiFi/Internet", icon: "📶" },
  { id: "academic", label: "Academic", icon: "📚" },
  { id: "ragging", label: "Ragging", icon: "🚨" },
  { id: "other", label: "Other", icon: "📌" },
];

const STATUS_BADGES = {
  submitted: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  in_progress: "bg-purple-100 text-purple-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-700"
};

export default function StudentComplaintsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("my_complaints"); // "my_complaints" | "submit"
  
  // My Complaints State
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Submit Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Add-on states
  const [similarInfo, setSimilarInfo] = useState(null);
  const [profanityError, setProfanityError] = useState("");
  const [limitError, setLimitError] = useState("");
  const [successScreen, setSuccessScreen] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    if (activeTab === "my_complaints" || activeTab === "public_complaints") {
      fetchComplaints(1, true);
    }
  }, [activeTab]);

  useEffect(() => {
    socketRef.current = getSocket("/notifications");
    
    if (socketRef.current) {
      socketRef.current.on("notification_push", (data) => {
        if (data.type === "complaint_update" || data.type === "complaint_comment") {
          toast.success(data.title + ": " + data.message);
          if (activeTab === "my_complaints" || activeTab === "public_complaints") fetchComplaints(1, true);
        }
      });
    }

    return () => {
      if (socketRef.current) socketRef.current.off("notification_push");
    };
  }, [activeTab]);

  const fetchComplaints = async (pageNum = 1, reset = false) => {
    try {
      if (reset) setLoading(true);
      const endpoint = activeTab === "public_complaints" ? "/api/complaints" : "/api/complaints/mine";
      const { data } = await api.get(`${endpoint}?page=${pageNum}&limit=10`);
      if (reset) {
        setComplaints(data.data.complaints);
      } else {
        setComplaints(prev => [...prev, ...data.data.complaints]);
      }
      setHasMore(data.data.pagination.hasNextPage);
      setPage(pageNum);
    } catch (err) {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  // ADD-ON 1: Similar Complaint Detection
  const checkSimilar = async () => {
    if (!title || title.length < 5 || !category) {
      setSimilarInfo(null);
      return;
    }
    try {
      const { data } = await api.post("/api/complaints/check-similar", { title, category });
      if (data.data.hasSimilar) {
        setSimilarInfo(data.data);
      } else {
        setSimilarInfo(null);
      }
    } catch (err) {
      // Quietly ignore check failure
    }
  };

  useEffect(() => {
    const timeout = setTimeout(checkSimilar, 800);
    return () => clearTimeout(timeout);
  }, [title, category]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProfanityError("");
    setLimitError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("isAnonymous", isAnonymous);
    if (image) formData.append("image", image);

    try {
      await api.post("/api/complaints", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSuccessScreen(true);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error?.includes("inappropriate")) {
        setProfanityError(err.response.data.error);
      } else if (err.response?.status === 429) {
        setLimitError(err.response.data.error);
      } else {
        toast.error(err.response?.data?.error || "Failed to submit complaint");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setIsAnonymous(false);
    setImage(null);
    setPreviewUrl(null);
    setSimilarInfo(null);
    setProfanityError("");
    setLimitError("");
    setSuccessScreen(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full max-w-lg">
        <button
          onClick={() => { setActiveTab("my_complaints"); setSuccessScreen(false); }}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
            activeTab === "my_complaints" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          My Complaints
        </button>
        <button
          onClick={() => { setActiveTab("public_complaints"); setSuccessScreen(false); }}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
            activeTab === "public_complaints" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Public Board
        </button>
        <button
          onClick={() => setActiveTab("submit")}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
            activeTab === "submit" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Submit New
        </button>
      </div>

      {(activeTab === "my_complaints" || activeTab === "public_complaints") && (
        <div className="space-y-4">
          {loading && page === 1 ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
              <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-800 dark:text-white">No complaints yet</h3>
              <p className="text-slate-500 mt-2 mb-6">
                {activeTab === "my_complaints" ? "You haven't submitted any complaints." : "No public complaints found."}
              </p>
              <button 
                onClick={() => setActiveTab("submit")}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
              >
                Submit a Complaint
              </button>
            </div>
          ) : (
            <>
              {complaints.map(comp => (
                <div key={comp._id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {CATEGORIES.find(c => c.id === comp.category)?.icon} {comp.category}
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${STATUS_BADGES[comp.status]}`}>
                      {comp.status.replace("_", " ")}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">
                    {comp.title} 
                    {comp.studentId?._id === user?._id && <span className="text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full ml-2">Yours</span>}
                    {comp.isAnonymous && <span className="text-xs text-slate-400 font-medium ml-2">(Anonymous)</span>}
                  </h3>
                  {activeTab === "public_complaints" && (
                    <p className="text-xs text-slate-500 font-medium mb-3">
                      By {comp.studentId?.name || "Unknown"}
                    </p>
                  )}
                  
                  {!expandedId || expandedId !== comp._id ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{comp.description}</p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{comp.description}</p>
                      {comp.imageUrl && (
                        <img src={comp.imageUrl} alt="Complaint" className="rounded-xl max-h-60 object-contain bg-slate-100 p-2" />
                      )}
                      
                      {/* Comments Timeline */}
                      {comp.comments && comp.comments.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Updates & Responses</h4>
                          <div className="space-y-4">
                            {comp.comments.map((comment, idx) => (
                              <div key={idx} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  {comment.authorName?.charAt(0) || "A"}
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-sm text-slate-800 dark:text-white">{comment.authorName}</span>
                                    <span className="text-[10px] bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">{comment.authorRole}</span>
                                    <span className="text-xs text-slate-400 ml-auto">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-300">{comment.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {comp.escalatedAt && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4" /> Escalated — No action for 48 hours
                    </div>
                  )}

                  <div className="mt-4 flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-700/50">
                    <span className="text-xs text-slate-400 font-medium">{new Date(comp.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" /> {comp.comments?.length || 0}
                      </span>
                      <button 
                        onClick={() => setExpandedId(expandedId === comp._id ? null : comp._id)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        {expandedId === comp._id ? "Hide Details" : "View Details →"}
                      </button>
                    </div>
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
      )}

      {activeTab === "submit" && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 dark:border-slate-700">
          {successScreen ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Complaint Submitted!</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                Your complaint will be reviewed within 24-48 hours. A confirmation email has been sent to you.
              </p>
              <div className="flex justify-center gap-4">
                <button onClick={() => { setActiveTab("my_complaints"); setSuccessScreen(false); }} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl">View My Complaints</button>
                <button onClick={resetForm} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">Submit Another</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">File a Complaint</h2>
                <p className="text-slate-500 text-sm">Report issues directly to the administration.</p>
              </div>

              {profanityError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Submission Blocked</p>
                    <p className="text-sm">{profanityError}</p>
                  </div>
                </div>
              )}

              {limitError && (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="font-bold">{limitError}</p>
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300">Category</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {CATEGORIES.map(cat => (
                    <div 
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-4 rounded-2xl cursor-pointer border-2 transition-all flex flex-col items-center gap-2 text-center ${
                        category === cat.id 
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                          : "border-slate-100 dark:border-slate-700 hover:border-blue-300 bg-white dark:bg-slate-800"
                      }`}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className={`text-xs font-bold ${category === cat.id ? "text-blue-700 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"}`}>
                        {cat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-black text-slate-700 dark:text-slate-300">Complaint Title</label>
                  <span className="text-xs font-bold text-slate-400">{title.length}/100</span>
                </div>
                <input 
                  type="text"
                  maxLength={100}
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief title of your complaint"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
                
                {/* ADD-ON 1 INFO BOX */}
                {similarInfo && (
                  <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl text-sm flex items-start gap-2 border border-blue-100 dark:border-blue-800">
                    <Info className="w-5 h-5 shrink-0" />
                    <p>
                      <strong>ℹ️ {similarInfo.uniqueStudentsCount} other students</strong> reported something similar in the last 7 days. This issue may already be known to the administration.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-black text-slate-700 dark:text-slate-300">Detailed Description</label>
                  <span className="text-xs font-bold text-slate-400">{description.length}/1000</span>
                </div>
                <textarea 
                  maxLength={1000}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide as much detail as possible..."
                  className="w-full min-h-[120px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Attachment (Optional)</label>
                <div className="flex items-center gap-4">
                  {previewUrl ? (
                    <div className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => { setImage(null); setPreviewUrl(null); }}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-blue-500">
                      <ImageIcon className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-bold">Upload</span>
                      <input type="file" accept="image/jpeg, image/png" className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                  <p className="text-xs text-slate-400 font-medium max-w-[200px]">Max 5MB (JPG/PNG). Good for maintenance or damage proof.</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-700">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">Submit Anonymously</h4>
                  <p className="text-xs text-slate-500 mt-1">Limited to 1 per day. Your name is hidden from teachers.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={submitting || !title || !description || !category}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
                {submitting ? "Submitting..." : "Submit Complaint"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
