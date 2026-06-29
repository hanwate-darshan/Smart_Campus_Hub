"use client";

import { useState, useEffect } from "react";
import { 
  Users, UserCircle, MessageSquare, Heart, X, Plus, Check, Loader2, ChevronRight, 
  ShieldCheck, DollarSign, Moon, Sun, Sparkles, ArrowRight, Handshake, Clock, Send, 
  AlertTriangle, Filter, MapPin, Camera
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/auth.store";
import { getNamespace } from "@/config/socket";

export default function RoommatePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("students"); // students, requests, profile
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data States
  const [matches, setMatches] = useState([]);
  const [requests, setRequests] = useState({ sent: [], received: [] });

  // Profile Form State
  const [formData, setFormData] = useState({
    gender: "male",
    budgetRange: { min: "", max: "" },
    department: "",
    year: "1st",
    duration: "semester",
    location: { state: "", city: "", area: "" },
    bio: "",
    isActive: true
  });
  const [hobbyInput, setHobbyInput] = useState("");
  const [dealBreakerInput, setDealBreakerInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Images
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 5MB size limit`);
        return false;
      }
      return true;
    });

    if (existingImages.length + images.length + validFiles.length > 3) {
      return toast.error("Maximum 3 images allowed total");
    }

    setImages(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for roommate requests
  useEffect(() => {
    if (!user) return;
    const notificationsNs = getNamespace("/notifications");
    
    const handleNotification = (payload) => {
      if (payload.type === "roommate_request") {
        fetchData();
      }
    };
    
    notificationsNs.on("notification_push", handleNotification);
    
    return () => {
      notificationsNs.off("notification_push", handleNotification);
    };
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Profile
      try {
        const { data: profData } = await api.get("/api/roommate/profile");
        if (profData.data) {
          setProfile(profData.data);
          setFormData({
            ...profData.data,
            budgetRange: profData.data.budgetRange || { min: "", max: "" },
            location: profData.data.location || { state: "", city: "", area: "" }
          });
          setExistingImages(profData.data.images || []);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          // Do nothing, let them stay on the students tab to browse
        }
      }

      // 2. Get Matches (if profile exists)
      try {
        const { data: matchData } = await api.get("/api/roommate/matches");
        setMatches(matchData.data || []);
      } catch (err) {}

      // 3. Get Requests
      try {
        const { data: reqData } = await api.get("/api/roommate/requests");
        setRequests(reqData.data || { sent: [], received: [] });
      } catch (err) {}

    } catch (err) {
      toast.error("Failed to load roommate data");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!formData.budgetRange.min || !formData.budgetRange.max || formData.budgetRange.min < 0) {
      return toast.error("Please enter a valid budget range");
    }
    setSaving(true);
    try {
      const dataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'budgetRange' || key === 'location') {
          dataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          dataToSend.append(key, formData[key]);
        }
      });
      dataToSend.append('existingImages', JSON.stringify(existingImages));
      images.forEach(img => dataToSend.append("images", img));

      const { data } = await api.post("/api/roommate/profile", dataToSend, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setProfile(data.data);
      setImages([]);
      setPreviews([]);
      setExistingImages(data.data.images || []);
      
      toast.success("Profile saved! You can now browse students.");
      fetchData();
      setActiveTab("students");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };


  const sendRequest = async (userId) => {
    if (!profile) {
      toast.error("Please create your profile first to send requests");
      setActiveTab("profile");
      return;
    }
    try {
      await api.post(`/api/roommate/request/${userId}`);
      toast.success("Roommate request sent!");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send request");
    }
  };

  const handleRequest = async (id, action) => {
    try {
      const { data } = await api.patch(`/api/roommate/request/${id}/${action}`);
      toast.success(`Request ${action}ed`);
      if (action === "accept" && data.chatRoomId) {
         router.push(`/student/marketplace/chat/${data.chatRoomId}`);
      }
      fetchData();
    } catch (err) {
      toast.error(`Failed to ${action} request`);
    }
  };

  const getScoreBadge = (score) => {
    if (score >= 90) return { label: "Great Match", color: "bg-emerald-500", text: "text-emerald-500", bg: "bg-emerald-50" };
    if (score >= 70) return { label: "Good Match", color: "bg-blue-500", text: "text-blue-500", bg: "bg-blue-50" };
    if (score >= 50) return { label: "Possible Match", color: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-50" };
    return { label: "Low Match", color: "bg-slate-400", text: "text-slate-400", bg: "bg-slate-50" };
  };

  if (loading && activeTab === "matches") return (
    <div className="flex flex-col items-center justify-center py-40">
       <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
       <p className="mt-4 text-slate-500 font-medium animate-pulse">Finding your perfect roommate...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" /> Roommate Finder
        </h1>
        <p className="text-slate-500 font-medium mt-2 max-w-2xl">
          Find highly compatible roommates based on lifestyle habits and preferences. 
          Your sensitive preferences are kept private and only used to find your best match.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["students", "requests", "profile"].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            {tab === "students" && <Sparkles className="w-4 h-4" />}
            {tab === "requests" && <MessageSquare className="w-4 h-4" />}
            {tab === "profile" && <UserCircle className="w-4 h-4" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "requests" && requests.received.length > 0 && (
              <span className="ml-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                {requests.received.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: STUDENTS */}
      {activeTab === "students" && (
        <div className="space-y-6">
          {!profile && matches.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
               <div>
                 <h3 className="text-lg font-black text-blue-900 dark:text-blue-400">Want to find your perfect match?</h3>
                 <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                   Create your roommate profile to see match scores and send requests!
                 </p>
               </div>
               <button 
                 onClick={() => setActiveTab("profile")}
                 className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl whitespace-nowrap"
               >
                 Create Profile
               </button>
            </div>
          )}
          {matches.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
               <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
               <h3 className="text-xl font-black text-slate-800 dark:text-white">No students found right now</h3>
               <p className="text-slate-500 mt-2">Try adjusting your preferences or check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map(match => {
                const badge = getScoreBadge(match.score);
                return (
                  <div key={match.userId} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center font-black text-slate-600 dark:text-slate-300 text-xl">
                            {match.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-black text-lg text-slate-800 dark:text-white">{match.name}</h3>
                            <p className="text-xs font-bold text-slate-400">{match.department} • {match.year}</p>
                            {match.location && match.location.city && (
                              <p className="text-xs font-bold text-blue-500 mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {match.location.area}, {match.location.city}, {match.location.state}
                              </p>
                            )}
                          </div>
                        </div>
                        {profile ? (
                          <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-full ${badge.color} text-white shadow-lg`}>
                            <span className="text-lg font-black leading-none">{match.score}</span>
                            <span className="text-[8px] font-bold uppercase">Match</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 shadow-sm">
                            <span className="text-lg font-black leading-none">?</span>
                          </div>
                        )}
                      </div>

                      {profile ? (
                        <div className="mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl">
                           <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Why this match?</h4>
                           <ul className="space-y-1">
                             {match.matchReasons?.length > 0 ? match.matchReasons.map((reason, i) => (
                               <li key={i} className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                 <Check className="w-3 h-3 text-blue-500" /> {reason}
                               </li>
                             )) : (
                               <li className="text-xs text-slate-500">Basic profile match</li>
                             )}
                           </ul>
                        </div>
                      ) : (
                        <div className="mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl text-center">
                           <p className="text-xs font-bold text-slate-500">Create profile to see match reasons</p>
                        </div>
                      )}

                      {match.bio && <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">"{match.bio}"</p>}

                      {match.images && match.images.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">PG/Hostel Photos</h4>
                          <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                            {match.images.map((img, idx) => (
                              <a href={img} target="_blank" rel="noreferrer" key={idx}>
                                <img src={img} className="h-20 w-20 object-cover rounded-xl shrink-0 snap-start border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={() => sendRequest(match.userId)}
                        className="w-full py-3 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white dark:bg-slate-700 dark:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" /> Send Request
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: REQUESTS */}
      {activeTab === "requests" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Received Requests */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" /> Received Requests
            </h3>
            {requests.received.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 font-medium">No pending requests</p>
              </div>
            ) : (
              requests.received.map(req => (
                <div key={req._id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-white">{req.senderId?.name}</h4>
                      <p className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    {req.status === "pending" && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                        {req.matchScore}% Match
                      </span>
                    )}
                  </div>

                  {req.status === "pending" ? (
                    <>
                      <p className="text-xs text-slate-500 italic mb-4">Full profile habits will unlock if you accept.</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleRequest(req._id, "accept")} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm">Accept & Chat</button>
                        <button onClick={() => handleRequest(req._id, "reject")} className="flex-1 py-2 bg-slate-100 hover:bg-red-500 text-slate-700 hover:text-white font-bold rounded-xl text-sm transition-colors">Reject</button>
                      </div>
                    </>
                  ) : req.status === "accepted" ? (
                    <div className="space-y-4">
                       <div className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold flex items-center gap-2">
                         <Handshake className="w-4 h-4" /> Request Accepted
                       </div>
                       
                       {/* Full Profile Reveal */}
                       {req.otherProfile && (
                         <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl space-y-3 text-sm">
                           <h5 className="font-black text-xs text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Full Profile Revealed</h5>
                           
                           <div className="grid grid-cols-2 gap-y-2">
                             <div className="text-slate-500">Budget</div>
                             <div className="font-bold">₹{req.otherProfile.budgetRange?.min} - ₹{req.otherProfile.budgetRange?.max}</div>
                             
                             <div className="text-slate-500">Duration</div>
                             <div className="font-bold capitalize">{req.otherProfile.duration?.replace("_", " ")}</div>
                           </div>

                           {req.otherProfile.images && req.otherProfile.images.length > 0 && (
                             <div className="mt-3">
                               <h5 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-2">Photos</h5>
                               <div className="flex gap-2 overflow-x-auto snap-x">
                                 {req.otherProfile.images.map((img, idx) => (
                                   <a href={img} target="_blank" rel="noreferrer" key={idx}>
                                     <img src={img} className="h-16 w-16 object-cover rounded-lg shrink-0 snap-start border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity" />
                                   </a>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>
                       )}

                       <button 
                         onClick={() => router.push(`/student/marketplace/chat/${req.chatRoomId}`)}
                         className="w-full py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold rounded-xl text-sm"
                       >
                         Open Chat
                       </button>
                    </div>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Rejected</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Sent Requests */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-slate-400" /> Sent Requests
            </h3>
            {requests.sent.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 font-medium">You haven't sent any requests</p>
              </div>
            ) : (
              requests.sent.map(req => (
                <div key={req._id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-black text-slate-800 dark:text-white">To: {req.receiverId?.name}</h4>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${
                      req.status === "pending" ? "bg-amber-100 text-amber-700" :
                      req.status === "accepted" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  
                  {req.status === "accepted" && req.otherProfile && (
                     <div className="mt-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl space-y-3 text-sm">
                       <h5 className="font-black text-xs text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Full Profile Revealed</h5>
                       <div className="grid grid-cols-2 gap-y-2">
                         <div className="text-slate-500">Duration</div>
                         <div className="font-bold capitalize">{req.otherProfile.duration?.replace("_", " ")}</div>
                       </div>
                       {req.otherProfile.images && req.otherProfile.images.length > 0 && (
                         <div className="mt-3">
                           <h5 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-2">Photos</h5>
                           <div className="flex gap-2 overflow-x-auto snap-x">
                             {req.otherProfile.images.map((img, idx) => (
                               <a href={img} target="_blank" rel="noreferrer" key={idx}>
                                 <img src={img} className="h-16 w-16 object-cover rounded-lg shrink-0 snap-start border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity" />
                               </a>
                             ))}
                           </div>
                         </div>
                       )}
                       <button 
                         onClick={() => router.push(`/student/marketplace/chat/${req.chatRoomId}`)}
                         className="mt-3 w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-sm transition-colors"
                       >
                         Open Chat
                       </button>
                     </div>
                  )}
                  {req.status === "pending" && (
                    <p className="text-xs text-slate-500 italic mt-2">Waiting for response...</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: PROFILE */}
      {activeTab === "profile" && (
        <form onSubmit={saveProfile} className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-10 border border-slate-100 dark:border-slate-700 shadow-sm max-w-3xl mx-auto space-y-8">
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex gap-4 items-start">
            <ShieldCheck className="w-8 h-8 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-black text-blue-900 dark:text-blue-400">Match Guarantee</h4>
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                Your profile is used to find your best matches based on Budget, Department, and Duration.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Gender</label>
              <select 
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Duration Needed</label>
              <select 
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none"
              >
                <option value="semester">This Semester Only</option>
                <option value="year">Full Academic Year</option>
                <option value="long_term">Long Term (Multiple Years)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Department</label>
              <input 
                required type="text" placeholder="e.g. Computer Science"
                value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Year</label>
              <select 
                value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none"
              >
                <option value="1st">1st Year</option>
                <option value="2nd">2nd Year</option>
                <option value="3rd">3rd Year</option>
                <option value="4th">4th Year</option>
              </select>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
             <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
               <MapPin className="w-4 h-4 text-blue-500" /> Preferred Location
             </label>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                 <input 
                   required type="text" placeholder="State (e.g. Maharashtra)"
                   value={formData.location.state} onChange={(e) => setFormData({ ...formData, location: { ...formData.location, state: e.target.value } })}
                   className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none"
                 />
               </div>
               <div>
                 <input 
                   required type="text" placeholder="City (e.g. Pune)"
                   value={formData.location.city} onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })}
                   className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none"
                 />
               </div>
               <div>
                 <input 
                   required type="text" placeholder="Area / Landmark"
                   value={formData.location.area} onChange={(e) => setFormData({ ...formData, location: { ...formData.location, area: e.target.value } })}
                   className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none"
                 />
               </div>
             </div>
          </div>

          <div>
             <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Budget Range (₹ per month)</label>
             <div className="flex items-center gap-4">
                <input 
                  required type="number" placeholder="Min" min="0"
                  value={formData.budgetRange.min} onChange={(e) => setFormData({ ...formData, budgetRange: { ...formData.budgetRange, min: e.target.value } })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none"
                />
                <span className="font-bold text-slate-400">to</span>
                <input 
                  required type="number" placeholder="Max" min="0"
                  value={formData.budgetRange.max} onChange={(e) => setFormData({ ...formData, budgetRange: { ...formData.budgetRange, max: e.target.value } })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none"
                />
             </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-8 space-y-6">

            {/* --- IMAGES --- */}
            <div className="space-y-4">
               <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                 <Camera className="w-4 h-4 text-blue-500" /> PG / Hostel Photos (Optional, Max 3)
               </label>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {existingImages.map((src, i) => (
                    <div key={`existing-${i}`} className="aspect-square relative rounded-3xl overflow-hidden group border border-slate-200 dark:border-slate-700">
                      <img src={src} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeExistingImage(i)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {previews.map((src, i) => (
                    <div key={`new-${i}`} className="aspect-square relative rounded-3xl overflow-hidden group border border-blue-200">
                      <img src={src} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(existingImages.length + previews.length) < 3 && (
                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group">
                      <Plus className="w-10 h-10 text-slate-300 group-hover:text-blue-500" />
                      <span className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-tighter">Add Photo</span>
                      <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
               </div>
               <p className="text-xs text-slate-500 font-bold">Showcase your room, PG, or flat so potential roommates can see where they'll stay.</p>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Bio</label>
              <textarea 
                maxLength={200}
                placeholder="Keep it casual — hobbies, daily routine, what you're looking for..."
                value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none min-h-[100px]"
              />
              <p className="text-xs font-bold text-slate-400 mt-1 text-right">{formData.bio.length}/200</p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button 
              type="submit" disabled={saving}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black rounded-xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Save & Find Matches
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
