"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  MapPin, 
  Calendar, 
  Search, 
  CheckCircle2, 
  X, 
  Loader2,
  Info,
  Archive,
  UserCheck,
  PackageCheck,
  Trash2,
  Image as ImageIcon,
  Clock,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

const STATUS_TABS = [
  { id: "pending", label: "Pending Verification", icon: <Clock className="w-4 h-4" />, color: "amber" },
  { id: "in_office", label: "In Office Hub", icon: <PackageCheck className="w-4 h-4" />, color: "emerald" },
  { id: "returned", label: "Returned Items", icon: <UserCheck className="w-4 h-4" />, color: "blue" },
  { id: "archived", label: "Archive Vault", icon: <Archive className="w-4 h-4" />, color: "slate" },
];

export default function TeacherLostFoundPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Return Modal State
  const [returnModalItem, setReturnModalItem] = useState(null);
  const [returnStudentId, setReturnStudentId] = useState("");
  const [returning, setReturning] = useState(false);

  // 1. Fetch Items
  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/lost-found?status=${activeTab}&limit=50`);
      // Since it's teacher/admin, we might need a separate 'all' endpoint if we want more data
      // But for now, getItems handles it
      setItems(data.data);
    } catch (err) {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  // 2. Action Handlers
  const handleVerify = async (itemId) => {
    try {
      await api.patch(`/api/lost-found/${itemId}/verify`);
      toast.success("Item verified and moved to Office Hub");
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || "Verification failed");
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    setReturning(true);
    try {
      await api.patch(`/api/lost-found/${returnModalItem._id}/return`, {
        returnedToStudentId: returnStudentId || null
      });
      toast.success("Item marked as returned successfully");
      setReturnModalItem(null);
      setReturnStudentId("");
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to mark as returned");
    } finally {
      setReturning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Lost & Found Management</h1>
          <p className="text-slate-500 font-medium">Verify receipt and manage property handovers</p>
        </div>

        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden shadow-inner">
           {STATUS_TABS.map((tab) => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition-all ${
                 activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xl scale-[1.02]' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
               }`}
             >
               {tab.icon} {tab.label}
             </button>
           ))}
        </div>
      </div>

      {/* --- CONTENT --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 text-center">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 text-slate-200">
            {activeTab === 'pending' ? <Clock className="w-10 h-10" /> : <Archive className="w-10 h-10" />}
          </div>
          <h3 className="text-2xl font-black text-slate-700 dark:text-white">All Clear</h3>
          <p className="text-slate-400 mt-2 max-w-sm mx-auto font-medium">There are currently no items in the <span className="font-bold text-slate-500">{activeTab.replace('_', ' ')}</span> section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {items.map((item) => (
            <div 
              key={item._id}
              className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-2xl transition-all group flex flex-col"
            >
              <div className="aspect-video relative overflow-hidden">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                   <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-full border border-slate-200 dark:border-slate-800">
                      ID: #{item._id.slice(-6)}
                   </span>
                   <span className="text-[10px] font-black text-slate-400 italic">
                      {new Date(item.createdAt).toLocaleDateString()}
                   </span>
                </div>

                <h3 className="text-xl font-black text-slate-800 dark:text-white line-clamp-1 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-6 flex-1">
                  {item.description}
                </p>

                <div className="space-y-3 mb-8">
                   <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                      <MapPin className="w-4 h-4 text-emerald-500" /> Found at {item.locationFound}
                   </div>
                </div>

                {/* --- ACTIONS --- */}
                {activeTab === "pending" && (
                   <button 
                     onClick={() => handleVerify(item._id)}
                     className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                   >
                     <PackageCheck className="w-5 h-5" /> MARK AS RECEIVED
                   </button>
                )}

                {activeTab === "in_office" && (
                   <button 
                     onClick={() => setReturnModalItem(item)}
                     className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                   >
                     <UserCheck className="w-5 h-5" /> MARK AS RETURNED
                   </button>
                )}

                {activeTab === "returned" && (
                   <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-3">
                      <UserCheck className="w-5 h-5 text-blue-500" />
                      <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Returned to Student</p>
                   </div>
                )}
                
                {activeTab === "archived" && (
                   <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <Archive className="w-5 h-5 text-slate-400" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moved to Archive Vault</p>
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- RETURN MODAL --- */}
      {returnModalItem && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
           <form 
              onSubmit={handleReturn}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden p-10 space-y-8 animate-in zoom-in-95 duration-200"
            >
              <div className="text-center">
                 <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <UserCheck className="w-10 h-10 text-blue-600" />
                 </div>
                 <h2 className="text-3xl font-black text-slate-800 dark:text-white">Handover Property</h2>
                 <p className="text-slate-500 font-medium mt-2 capitalize">Returning: {returnModalItem.title}</p>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student MongoDB ID (Optional)</label>
                 <input 
                   type="text" 
                   placeholder="Enter student ID who claimed item"
                   value={returnStudentId}
                   onChange={(e) => setReturnStudentId(e.target.value)}
                   className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-white transition-all"
                 />
                 <p className="text-[10px] text-slate-400 pt-1 flex items-center gap-1 font-bold">
                    <Info className="w-3 h-3 text-blue-500" /> Leave blank if student is not registered yet.
                 </p>
              </div>

              <div className="flex gap-4 pt-2">
                 <button 
                   type="button"
                   onClick={() => setReturnModalItem(null)}
                   className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm hover:bg-slate-200 transition-all"
                 >
                   CANCEL
                 </button>
                 <button 
                   type="submit"
                   disabled={returning}
                   className="flex-[2] py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                 >
                    {returning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    CONFIRM HANDOVER
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
}
