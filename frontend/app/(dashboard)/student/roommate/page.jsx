"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  UserCircle, 
  MessageSquare, 
  Heart, 
  X, 
  Plus, 
  Check, 
  Loader2, 
  ChevronRight, 
  Filter, 
  ShieldCheck, 
  DollarSign, 
  Moon, 
  Sun, 
  Sparkles,
  ArrowRight,
  Handshake,
  Clock,
  Send,
  ExternalLink
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RoommatePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("matches");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data States
  const [matches, setMatches] = useState([]);
  const [requests, setRequests] = useState({ sent: [], received: [] });
  const [rooms, setRooms] = useState([]);

  // Profile Form State
  const [formData, setFormData] = useState({
    budget: "",
    department: "",
    year: "1st",
    smoking: false,
    sleepSchedule: "early",
    cleanliness: "medium",
    hobbies: [],
    bio: "",
    isActive: true
  });
  const [hobbyInput, setHobbyInput] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile
      const profRes = await api.get("/api/roommate/profile").catch(() => ({ data: { data: null } }));
      if (profRes.data.data) {
        setProfile(profRes.data.data);
        setFormData(profRes.data.data);
      }

      // 2. Fetch Matches if profile exists
      if (profRes.data.data) {
        const matchRes = await api.get("/api/roommate/matches");
        setMatches(matchRes.data.data);
      }

      // 3. Fetch Requests
      const reqRes = await api.get("/api/roommate/requests");
      setRequests(reqRes.data.data);

      // 4. Fetch Chats
      const chatRes = await api.get("/api/chat/rooms");
      setRooms(chatRes.data.data.filter(r => r.type === "roommate"));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // --- Handlers ---
  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/roommate/profile", formData);
      setProfile(data.data);
      toast.success("Profile updated successfully!");
      setActiveTab("matches");
    } catch (err) {
      toast.error("Failed to save profile");
    }
  };

  const addHobby = (e) => {
    if (e.key === "Enter" && hobbyInput.trim()) {
      e.preventDefault();
      if (formData.hobbies.length >= 10) return toast.error("Max 10 hobbies allowed");
      if (!formData.hobbies.includes(hobbyInput.trim())) {
        setFormData({ ...formData, hobbies: [...formData.hobbies, hobbyInput.trim()] });
      }
      setHobbyInput("");
    }
  };

  const removeHobby = (hobby) => {
    setFormData({ ...formData, hobbies: formData.hobbies.filter(h => h !== hobby) });
  };

  const sendRequest = async (userId) => {
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
       <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Comparing lifestyles...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
           <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Roommate Finder</h1>
           <p className="text-slate-500 font-medium text-lg">Find the perfect partner for your campus stay.</p>
        </div>

        <div className="flex p-2 bg-slate-100 dark:bg-slate-800 rounded-[2rem] shadow-inner overflow-x-auto scrollbar-hide">
           {[
             { id: "matches", label: "Find Matches", icon: <Users className="w-4 h-4" /> },
             { id: "profile", label: "My Profile", icon: <UserCircle className="w-4 h-4" /> },
             { id: "requests", label: "Requests", icon: <Handshake className="w-4 h-4" />, badge: requests.received.filter(r => r.status === 'pending').length },
             { id: "chats", label: "My Chats", icon: <MessageSquare className="w-4 h-4" /> }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-sm transition-all whitespace-nowrap relative ${
                 activeTab === tab.id 
                   ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xl' 
                   : 'text-slate-500 hover:text-slate-700'
               }`}
             >
               {tab.icon} {tab.label}
               {tab.badge > 0 && (
                 <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                    {tab.badge}
                 </span>
               )}
             </button>
           ))}
        </div>
      </div>

      {/* --- TAB CONTENT --- */}
      <div className="min-h-[60vh]">
        
        {/* TAB 1: FIND MATCHES */}
        {activeTab === "matches" && (
          <div className="space-y-10">
            {!profile ? (
              <div className="bg-blue-600 rounded-[4rem] p-16 text-center text-white relative overflow-hidden">
                 <div className="relative z-10 max-w-xl mx-auto space-y-8">
                    <Sparkles className="w-16 h-16 mx-auto text-blue-200 animate-pulse" />
                    <h2 className="text-4xl font-black tracking-tight">Personalize Your Search</h2>
                    <p className="text-blue-100 text-xl font-medium leading-relaxed">
                      To see compatible roommates, we need to know your lifestyle preferences and budget.
                    </p>
                    <button 
                      onClick={() => setActiveTab("profile")}
                      className="bg-white text-blue-600 font-black px-10 py-6 rounded-[2.5rem] text-xl shadow-2xl hover:scale-105 transition-all active:scale-95"
                    >
                      CREATE YOUR PROFILE
                    </button>
                 </div>
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
                 <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />
              </div>
            ) : matches.length === 0 ? (
              <div className="py-32 text-center bg-white dark:bg-slate-800 rounded-[4rem] border border-slate-100 dark:border-slate-700">
                 <Filter className="w-16 h-16 text-slate-100 dark:text-slate-700 mx-auto mb-6" />
                 <h3 className="text-3xl font-black text-slate-700 dark:text-white">No Matches Found</h3>
                 <p className="text-slate-400 mt-2 font-medium max-w-sm mx-auto">
                    Try broadening your budget or checking back later as new students join.
                 </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {matches.map((match) => {
                  const badge = getScoreBadge(match.score);
                  return (
                    <div key={match.userId} className="bg-white dark:bg-slate-800 rounded-[3.5rem] p-8 border border-slate-100 dark:border-slate-700 hover:shadow-2xl transition-all group flex flex-col relative">
                       {/* Compatibility Badge */}
                       <div className={`absolute top-8 right-8 px-4 py-1.5 rounded-full ${badge.bg} ${badge.text} text-[10px] font-black uppercase tracking-widest border border-current/20`}>
                          {match.score}% {badge.label}
                       </div>

                       <div className="flex items-center gap-5 pt-4">
                          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-[2rem] flex items-center justify-center text-3xl shrink-0">
                             👤
                          </div>
                          <div>
                             <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                               {match.name.split(" ")[0]}
                             </h3>
                             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                {match.year} Year • {match.department}
                             </p>
                          </div>
                       </div>

                       <div className="mt-10 mb-8 flex-1 space-y-6">
                          <div className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                             <div className="flex items-center justify-between mb-3 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                                <span>Monthly Budget</span>
                                <span className="text-blue-600">₹{match.budget}</span>
                             </div>
                             <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((match.budget / 15000) * 100, 100)}%` }} />
                             </div>
                          </div>

                          <p className="text-slate-600 dark:text-slate-300 font-medium line-clamp-2 italic text-sm">
                            "{match.bio || "Just looking for a chill roommate to share a room and maybe some coffee!"}"
                          </p>

                          <div className="flex flex-wrap gap-2">
                             {match.hobbies.slice(0, 4).map(h => (
                               <span key={h} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                  #{h}
                               </span>
                             ))}
                             {match.hobbies.length > 4 && <span className="text-[10px] font-bold text-slate-400">+{match.hobbies.length - 4} more</span>}
                          </div>
                       </div>

                       <button 
                         onClick={() => sendRequest(match.userId)}
                         className="w-full py-5 bg-slate-900 hover:bg-blue-600 text-white rounded-3xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 group/btn"
                       >
                          SEND REQUEST <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                       </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY PROFILE */}
        {activeTab === "profile" && (
          <div className="max-w-4xl mx-auto">
             <form onSubmit={saveProfile} className="bg-white dark:bg-slate-800 rounded-[4rem] p-12 md:p-20 border border-slate-100 dark:border-slate-700 shadow-2xl space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   {/* Lifestyle info */}
                   <div className="space-y-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <DollarSign className="w-3 h-3 text-blue-500" /> Monthly Budget (INR)
                         </label>
                         <input 
                           type="number"
                           required
                           value={formData.budget}
                           onChange={(e) => setFormData({...formData, budget: e.target.value})}
                           className="w-full px-8 py-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 font-black text-slate-800 dark:text-white transition-all"
                           placeholder="e.g. 5000"
                         />
                      </div>

                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sleep Schedule</label>
                         <div className="grid grid-cols-2 gap-4">
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, sleepSchedule: 'early'})}
                              className={`py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${formData.sleepSchedule === 'early' ? 'bg-amber-100 text-amber-600 border-2 border-amber-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-2 border-transparent'}`}
                            >
                               <Sun className="w-4 h-4" /> EARLY BIRD
                            </button>
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, sleepSchedule: 'late'})}
                              className={`py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${formData.sleepSchedule === 'late' ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-2 border-transparent'}`}
                            >
                               <Moon className="w-4 h-4" /> NIGHT OWL
                            </button>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Smoking</label>
                         <div className="flex gap-4">
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, smoking: false})}
                              className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all ${!formData.smoking ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-2 border-transparent'}`}
                            >
                               NO SMOKING
                            </button>
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, smoking: true})}
                              className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all ${formData.smoking ? 'bg-red-100 text-red-600 border-2 border-red-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-2 border-transparent'}`}
                            >
                               I SMOKE
                            </button>
                         </div>
                      </div>
                   </div>

                   {/* Bio and Hobbies */}
                   <div className="space-y-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department & Year</label>
                         <div className="flex gap-4">
                            <input 
                              type="text"
                              required
                              placeholder="Dept (e.g. IT)"
                              value={formData.department}
                              onChange={(e) => setFormData({...formData, department: e.target.value})}
                              className="flex-[2] px-6 py-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 font-black text-slate-800 dark:text-white"
                            />
                            <select 
                               value={formData.year}
                               onChange={(e) => setFormData({...formData, year: e.target.value})}
                               className="flex-1 px-4 py-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 font-black text-slate-800 dark:text-white"
                            >
                               <option value="1st">1st Year</option>
                               <option value="2nd">2nd Year</option>
                               <option value="3rd">3rd Year</option>
                               <option value="4th">4th Year</option>
                            </select>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bio (200 Chars)</label>
                         <textarea 
                           rows="4"
                           maxLength="200"
                           value={formData.bio}
                           onChange={(e) => setFormData({...formData, bio: e.target.value})}
                           className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-300 resize-none"
                           placeholder="Describe your ideal roommate..."
                         />
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hobbies (Type & Enter - Max 10)</label>
                      <div className="flex flex-wrap gap-3 p-6 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                         {formData.hobbies.map(hobby => (
                           <span key={hobby} className="px-4 py-2 bg-blue-600 text-white rounded-2xl text-[10px] font-black flex items-center gap-2 animate-in zoom-in-90">
                              {hobby}
                              <button type="button" onClick={() => removeHobby(hobby)}><X className="w-3 h-3" /></button>
                           </span>
                         ))}
                         <input 
                           type="text"
                           value={hobbyInput}
                           onKeyDown={addHobby}
                           onChange={(e) => setHobbyInput(e.target.value)}
                           className="bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-slate-400 p-0"
                           placeholder="Add hobby..."
                         />
                      </div>
                   </div>
                </div>

                <div className="flex items-center justify-between p-8 bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] border border-blue-100 dark:border-blue-800">
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${formData.isActive ? 'bg-blue-600' : 'bg-slate-300'}`} onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'left-7' : 'left-1'}`} />
                      </div>
                      <span className="text-sm font-black text-blue-800 dark:text-blue-300 uppercase tracking-tighter">Visible to others</span>
                   </div>
                   <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-12 py-5 rounded-[2rem] shadow-2xl transition-all shadow-blue-500/30 active:scale-95">
                      SAVE PROFILE
                   </button>
                </div>
             </form>
          </div>
        )}

        {/* TAB 3: REQUESTS */}
        {activeTab === "requests" && (
           <div className="space-y-16">
              {/* RECEIVED */}
              <div className="space-y-8">
                 <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <Handshake className="w-8 h-8 text-blue-600" /> Received Requests
                 </h2>
                 {requests.received.length === 0 ? (
                    <div className="p-16 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                       <Clock className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                       <p className="font-bold text-slate-400">No incoming requests yet.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                       {requests.received.map(req => {
                          const badge = getScoreBadge(req.matchScore);
                          return (
                            <div key={req._id} className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                               <div>
                                  <div className="flex items-center justify-between mb-6">
                                     <div className={`px-4 py-1.5 rounded-full ${badge.bg} ${badge.text} text-[10px] font-black uppercase tracking-widest`}>
                                        {req.matchScore}% Score
                                     </div>
                                     <span className="text-[10px] font-bold text-slate-300">
                                        {new Date(req.createdAt).toLocaleDateString()}
                                     </span>
                                  </div>
                                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">{req.senderId.name}</h3>
                                  <p className="text-sm text-slate-400 font-medium mt-1 uppercase tracking-widest">Matched via Lifestyle</p>
                               </div>

                               <div className="flex gap-4 mt-10">
                                  {req.status === 'pending' ? (
                                    <>
                                       <button 
                                          onClick={() => handleRequest(req._id, 'accept')}
                                          className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20"
                                       >
                                          ACCEPT
                                       </button>
                                       <button 
                                          onClick={() => handleRequest(req._id, 'reject')}
                                          className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm"
                                       >
                                          REJECT
                                       </button>
                                    </>
                                  ) : (
                                    <div className={`w-full py-4 text-center rounded-2xl font-black text-sm uppercase tracking-widest ${req.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                       {req.status}
                                    </div>
                                  )}
                               </div>
                            </div>
                          )
                       })}
                    </div>
                 )}
              </div>

              {/* SENT */}
              <div className="space-y-8">
                 <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <Send className="w-8 h-8 text-blue-600" /> Sent Requests
                 </h2>
                 {requests.sent.length === 0 ? (
                    <div className="p-16 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                       <Clock className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                       <p className="font-bold text-slate-400">You haven't sent any requests yet.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                       {requests.sent.map(req => (
                         <div key={req._id} className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                               <h3 className="text-xl font-black text-slate-800 dark:text-white">{req.receiverId.name}</h3>
                               <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${req.status === 'accepted' ? 'text-emerald-500' : req.status === 'rejected' ? 'text-red-500' : 'text-amber-500'}`}>
                                  {req.status}
                               </p>
                            </div>
                            {req.status === 'accepted' && (
                               <button 
                                 onClick={() => router.push(`/student/marketplace/chat/${req.chatRoomId}`)}
                                 className="p-4 bg-blue-100 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-md group"
                               >
                                  <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                               </button>
                            )}
                         </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        )}

        {/* TAB 4: CHATS */}
        {activeTab === "chats" && (
           <div className="space-y-8">
              <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-blue-600" /> Roommate Conversations
              </h2>
              {rooms.length === 0 ? (
                 <div className="py-32 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700">
                    <MessageSquare className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-6" />
                    <h3 className="text-2xl font-black text-slate-700 dark:text-white">Start a Conversation</h3>
                    <p className="text-slate-400 mt-2 font-medium max-w-sm mx-auto">
                      Accepted roommate matches will appear here for you to finalize the room details.
                    </p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   {rooms.map(room => (
                      <div 
                        key={room._id}
                        onClick={() => router.push(`/student/marketplace/chat/${room._id}`)}
                        className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 cursor-pointer group hover:shadow-2xl transition-all"
                      >
                         <div className="flex items-center gap-5 mb-4">
                            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-xl shrink-0">
                               👤
                            </div>
                            <div className="flex-1">
                               <h3 className="text-xl font-black text-slate-800 dark:text-white">{room.otherParticipantName}</h3>
                               <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">Roommate Match</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                         </div>
                         <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-700">
                            <p className="text-sm text-slate-500 font-medium line-clamp-1 italic">
                               {room.lastMessage || "No messages yet. Say hi!"}
                            </p>
                            <span className="text-[10px] font-bold text-slate-400 mt-2 block">
                               {room.lastMessageAt ? new Date(room.lastMessageAt).toLocaleTimeString() : 'N/A'}
                            </span>
                         </div>
                      </div>
                   ))}
                </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
}
