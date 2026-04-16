"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Package, 
  User, 
  Tag, 
  Info,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  ShieldAlert
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function AdminMarketplacePage() {
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' or 'reported'
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Rejection Modal State
  const [rejectionListing, setRejectionListing] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Carousel State: { listingId: currentIndex }
  const [carouselIndex, setCarouselIndex] = useState({});

  const fetchListings = async () => {
    setLoading(true);
    try {
      // For Admin, we might need a specialized endpoint or query
      // For now, using the main listing endpoint with status filter
      const endpoint = activeTab === "pending" 
        ? "/api/listings?status=pending" 
        : "/api/listings?status=approved"; // We'll filter reported ones locally if needed
        
      const { data } = await api.get(endpoint);
      
      let filtered = data.data;
      if (activeTab === "reported") {
        // High report count items
         filtered = data.data.filter(l => l.reportCount >= 3).sort((a, b) => b.reportCount - a.reportCount);
      }
      
      setListings(filtered);
    } catch (err) {
      toast.error("Failed to load marketplace data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [activeTab]);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/api/listings/${id}/approve`);
      toast.success("Listing approved and live!");
      fetchListings();
    } catch (err) {
      toast.error("Failed to approve listing");
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return toast.error("Please provide a reason");

    setProcessing(true);
    try {
      await api.patch(`/api/listings/${rejectionListing._id}/reject`, {
        reason: rejectionReason
      });
      toast.success("Listing rejected and seller notified");
      setRejectionListing(null);
      setRejectionReason("");
      fetchListings();
    } catch (err) {
      toast.error("Failed to reject listing");
    } finally {
      setProcessing(false);
    }
  };

  const toggleImage = (listingId, totalImages, direction) => {
    const currentIndex = carouselIndex[listingId] || 0;
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = totalImages - 1;
    if (nextIndex >= totalImages) nextIndex = 0;
    setCarouselIndex({ ...carouselIndex, [listingId]: nextIndex });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Market Moderation</h1>
          <p className="text-slate-500 font-medium">Approve new listings and handle community reports</p>
        </div>

        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
           <button 
             onClick={() => setActiveTab("pending")}
             className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}
           >
             <Clock className="w-4 h-4" /> Pending Approval
           </button>
           <button 
             onClick={() => setActiveTab("reported")}
             className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'reported' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500'}`}
           >
             <ShieldAlert className="w-4 h-4" /> Reported Items
           </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
           <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
           <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Scanning database...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700">
           <Package className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-6" />
           <h3 className="text-2xl font-black text-slate-700 dark:text-white">All Caught Up!</h3>
           <p className="text-slate-400 mt-2 font-medium">No {activeTab} listings to review right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {listings.map((item) => {
             const currentIndex = carouselIndex[item._id] || 0;
             const hasMultiple = item.images && item.images.length > 1;

             return (
               <div key={item._id} className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col">
                  {/* Carousel */}
                  <div className="aspect-video relative bg-slate-100 dark:bg-slate-900 overflow-hidden">
                     <img 
                       src={item.images ? item.images[currentIndex] : item.image} 
                       alt={item.title} 
                       className="w-full h-full object-contain"
                     />
                     {hasMultiple && (
                       <>
                         <button 
                           onClick={() => toggleImage(item._id, item.images.length, -1)}
                           className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/50"
                         >
                           <ChevronLeft className="w-5 h-5" />
                         </button>
                         <button 
                           onClick={() => toggleImage(item._id, item.images.length, 1)}
                           className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/50"
                         >
                           <ChevronRight className="w-5 h-5" />
                         </button>
                         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/40 text-white text-[10px] font-bold rounded-full backdrop-blur-md">
                           {currentIndex + 1} / {item.images.length}
                         </div>
                       </>
                     )}
                     {activeTab === "reported" && (
                        <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg animate-pulse flex items-center gap-1.5">
                           <ShieldAlert className="w-3 h-3" /> {item.reportCount} REPORTS
                        </div>
                     )}
                  </div>

                  {/* Info */}
                  <div className="p-8 flex-1 flex flex-col">
                     <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                           {item.category}
                        </span>
                        <span className="text-xl font-black text-slate-800 dark:text-white">₹{item.price}</span>
                     </div>

                     <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{item.title}</h3>
                     <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-6">{item.description}</p>

                     <div className="mt-auto space-y-6">
                        <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                           <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg">
                              👤
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-slate-400 capitalize">Seller: {item.sellerFirstName || "Student"}</p>
                              <p className="text-[10px] font-black text-slate-400">ID: #{item._id.slice(-6)}</p>
                           </div>
                        </div>

                        <div className="flex gap-4">
                           {activeTab === "pending" ? (
                             <>
                               <button 
                                 onClick={() => handleApprove(item._id)}
                                 className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                               >
                                 <CheckCircle className="w-4 h-4" /> APPROVE
                               </button>
                               <button 
                                 onClick={() => setRejectionListing(item)}
                                 className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl font-black text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/40"
                               >
                                 <XCircle className="w-4 h-4" /> REJECT
                               </button>
                             </>
                           ) : (
                             <>
                                <button 
                                  onClick={() => handleApprove(item._id)} // Simple 'Keep' re-approves essentially
                                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2"
                                >
                                  <Eye className="w-4 h-4" /> IGNORE / KEEP
                                </button>
                                <button 
                                  onClick={() => setRejectionListing(item)}
                                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" /> REMOVE ITEM
                                </button>
                             </>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
             );
          })}
        </div>
      )}

      {/* --- REJECTION MODAL --- */}
      {rejectionListing && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
           <form 
              onSubmit={handleReject}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-6 animate-in zoom-in-95 duration-200"
            >
              <div className="text-center">
                 <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-red-600" />
                 </div>
                 <h2 className="text-3xl font-black text-slate-800 dark:text-white">Reject Listing</h2>
                 <p className="text-slate-500 font-medium mt-2">Item: {rejectionListing.title}</p>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Rejection</label>
                 <textarea 
                   required
                   rows="4"
                   placeholder="e.g. Inappropriate images, commercial ad, fake price..."
                   value={rejectionReason}
                   onChange={(e) => setRejectionReason(e.target.value)}
                   className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-red-500 font-bold text-slate-800 dark:text-white transition-all resize-none"
                 />
              </div>

              <div className="flex gap-4 pt-4">
                 <button 
                   type="button"
                   onClick={() => setRejectionListing(null)}
                   className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm"
                 >
                   CANCEL
                 </button>
                 <button 
                   type="submit"
                   disabled={processing}
                   className="flex-[2] py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                 >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    CONFIRM REJECTION
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
}
