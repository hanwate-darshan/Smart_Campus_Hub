"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Package, 
  Plus, 
  MapPin, 
  Calendar, 
  Search, 
  Image as ImageIcon, 
  X, 
  Send, 
  Loader2,
  Info,
  Maximize2,
  ShieldAlert,
  Archive
} from "lucide-react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import api from "@/lib/api";
import useAuthStore from "@/store/auth.store";

const SOCKET_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/notifications`;

export default function StudentLostFoundPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("browse"); // 'browse' or 'report'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    locationFound: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const socketRef = useRef(null);

  // 1. Fetch Items
  const fetchItems = async () => {
    try {
      const { data } = await api.get("/api/lost-found?status=in_office");
      setItems(data.data);
    } catch (err) {
      toast.error("Failed to load lost items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();

    // Socket Setup
    const token = localStorage.getItem("accessToken");
    socketRef.current = io(SOCKET_URL, { 
      auth: (cb) => cb({ token: localStorage.getItem("accessToken") })
    });

    socketRef.current.on("item_now_in_office", (payload) => {
      toast.success(payload.message, { icon: '📦', duration: 6000 });
      fetchItems();
    });

    socketRef.current.on("new_lost_found_item", (payload) => {
      toast(`${payload.title} was found at ${payload.locationFound}`, {
        icon: '🔍',
        duration: 5000
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

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
    if (!selectedFile) return toast.error("Please upload an image of the item");
    if (formData.title.length < 3) return toast.error("Title too short");

    setSubmitting(true);
    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("locationFound", formData.locationFound);
    data.append("image", selectedFile);

    try {
      await api.post("/api/lost-found", data);
      toast.success("Item reported! Please bring it to the office.");
      setFormData({ title: "", description: "", locationFound: "" });
      removeFile();
      setActiveTab("browse");
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to report item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Lost & Found</h1>
          <p className="text-slate-500 font-medium mt-1">Found something? Report it. Lost something? Browse the office store.</p>
        </div>

        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button 
            onClick={() => setActiveTab("browse")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'browse' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Search className="w-4 h-4" /> Browse Items
          </button>
          <button 
            onClick={() => setActiveTab("report")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'report' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Plus className="w-4 h-4" /> Report Found
          </button>
        </div>
      </div>

      {activeTab === "browse" ? (
        /* --- BROWSE TAB --- */
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 text-slate-300">
                <Archive className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-700 dark:text-white">Office is Empty</h3>
              <p className="text-slate-400 mt-2 max-w-xs mx-auto">No items are currently pending at the office. Check back later!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <div 
                  key={item._id}
                  className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 overflow-hidden group hover:shadow-2xl transition-all cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-4 left-4">
                       <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">IN OFFICE</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-black text-slate-800 dark:text-white truncate">{item.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mt-2">
                       <MapPin className="w-3 h-3 text-emerald-500" /> {item.locationFound}
                    </div>
                    <button className="w-full mt-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      VIEW DETAILS
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* --- REPORT TAB --- */
        <div className="grid lg:grid-cols-2 gap-10">
          <form 
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 p-8 md:p-12 space-y-6"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">What did you find?</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Blue Water Bottle, Keys, Wallet"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 dark:text-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Where was it found?</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Main Library, Room 402, Gym"
                  value={formData.locationFound}
                  onChange={(e) => setFormData({...formData, locationFound: e.target.value})}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 dark:text-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Brief Description</label>
                <textarea 
                  required
                  rows="3"
                  placeholder="Color, brand name, or any unique features..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 dark:text-white transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Item Photo</label>
                {!previewUrl ? (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                    <div className="flex flex-col items-center justify-center">
                       <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter text-center px-4">Tap to upload clear photo</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                ) : (
                  <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={removeFile} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"><X className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex gap-3 items-start">
               <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
               <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 leading-relaxed uppercase tracking-widest">
                 AFTER SUBMITTING, PLEASE BRING THE ITEM TO THE COLLEGE OFFICE (ROOM 101) BETWEEN 9 AM - 5 PM.
               </p>
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-black text-lg transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              SUBMIT FOUND ITEM
            </button>
          </form>

          <div className="hidden lg:block space-y-6">
             <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <ShieldAlert className="w-40 h-40 absolute -bottom-10 -right-10 opacity-10 rotate-12" />
                <h2 className="text-4xl font-black tracking-tight mb-4">Found something?</h2>
                <p className="text-emerald-50 text-lg font-medium leading-relaxed">
                  Your honesty helps keep our campus strong. Reporting found items ensures they return to their rightful owners safely through the official verification process.
                </p>
                <div className="mt-10 space-y-4">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">1</div>
                      <p className="font-bold">Snap a clear photo of the item</p>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">2</div>
                      <p className="font-bold">Provide details and location</p>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">3</div>
                      <p className="font-bold">Hand it over at the College Office</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* --- DETAIL MODAL --- */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
              <div className="md:w-1/2 h-80 md:h-[500px] relative">
                 <img src={selectedItem.imageUrl} alt={selectedItem.title} className="w-full h-full object-cover" />
                 <button onClick={() => setSelectedItem(null)} className="md:hidden absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="md:w-1/2 p-10 flex flex-col">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-emerald-500 border border-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest">In Office Verification</span>
                    <button onClick={() => setSelectedItem(null)} className="hidden md:block text-slate-300 hover:text-slate-500 transition-colors"><X className="w-6 h-6" /></button>
                 </div>
                 <h2 className="text-3xl font-black text-slate-800 dark:text-white mt-4">{selectedItem.title}</h2>
                 <div className="flex items-center gap-2 mt-2 text-slate-400 font-bold text-sm">
                    <MapPin className="w-4 h-4 text-emerald-500" /> Found at {selectedItem.locationFound}
                 </div>
                 <div className="flex items-center gap-2 mt-1 text-slate-400 font-bold text-sm">
                    <Calendar className="w-4 h-4 text-emerald-500" /> Added {new Date(selectedItem.createdAt).toLocaleDateString()}
                 </div>

                 <div className="mt-8 space-y-4 flex-1 overflow-y-auto pr-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</h4>
                    <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{selectedItem.description}</p>
                 </div>

                 <div className="mt-10 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/30">
                    <div className="flex gap-4 items-center">
                       <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white">
                          <Maximize2 className="w-6 h-6" />
                       </div>
                       <div className="flex-1">
                          <h4 className="font-black text-blue-700 dark:text-blue-300 text-sm">This is mine!</h4>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 uppercase tracking-tighter">Visit the college office with your ID card to claim this item.</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
