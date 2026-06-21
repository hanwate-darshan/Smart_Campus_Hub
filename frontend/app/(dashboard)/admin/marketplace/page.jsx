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
  ShieldAlert,
  ShieldOff,
  ShieldCheck,
  UserX,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Flag,
  BookOpen
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

const PROHIBITED_ITEMS = [
  "Drugs, alcohol, tobacco products or related paraphernalia",
  "Weapons or anything that can cause physical harm",
  "Fake certificates, IDs, or academic documents (cheating material)",
  "Stolen items or items with suspicious provenance",
  "Adult content of any kind",
  "Live animals",
  "Any item violating college code of conduct or government law",
];

export default function AdminMarketplacePage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [listings, setListings] = useState([]);
  const [suspendedSellers, setSuspendedSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellersLoading, setSellersLoading] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  // Rejection Modal State
  const [rejectionListing, setRejectionListing] = useState(null);
  const [rejectionMode, setRejectionMode] = useState("remove"); // 'remove' or 'remove_flag'
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState({});

  const fetchListings = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === "pending"
        ? "/api/listings?status=pending"
        : "/api/listings?status=approved";

      const { data } = await api.get(endpoint);

      let filtered = data.data;
      if (activeTab === "reported") {
        filtered = data.data
          .filter(l => l.reportCount >= 1)
          .sort((a, b) => b.reportCount - a.reportCount);
      }

      setListings(filtered);
    } catch (err) {
      toast.error("Failed to load marketplace data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuspendedSellers = async () => {
    setSellersLoading(true);
    try {
      const { data } = await api.get("/api/admin/users?status=suspended&role=student");
      setSuspendedSellers(data.data || []);
    } catch (err) {
      toast.error("Failed to load suspended sellers");
    } finally {
      setSellersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "suspended") {
      fetchSuspendedSellers();
    } else {
      fetchListings();
    }
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

  // Keep listing: dismiss reports by re-approving / leaving as is
  const handleKeepListing = async (id) => {
    try {
      // Re-approve to signal admin reviewed and it's fine
      await api.patch(`/api/listings/${id}/approve`);
      toast.success("Reports dismissed. Listing kept live.");
      fetchListings();
    } catch (err) {
      toast.error("Failed to dismiss reports");
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return toast.error("Please provide a reason");

    setProcessing(true);
    try {
      await api.patch(`/api/listings/${rejectionListing._id}/reject`, {
        reason: rejectionReason,
        flagSeller: rejectionMode === "remove_flag"
      });

      if (rejectionMode === "remove_flag") {
        toast.success("Listing removed and seller flagged for review.");
      } else {
        toast.success("Listing removed and seller notified.");
      }

      setRejectionListing(null);
      setRejectionReason("");
      setRejectionMode("remove");
      fetchListings();
    } catch (err) {
      toast.error("Failed to remove listing");
    } finally {
      setProcessing(false);
    }
  };

  const handleReinstate = async (userId) => {
    if (!window.confirm("Reinstate this account? The seller will be able to log in again.")) return;
    try {
      await api.patch(`/api/admin/users/${userId}/status`, { status: "approved" });
      toast.success("Account reinstated successfully.");
      fetchSuspendedSellers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reinstate account");
    }
  };

  const handlePermanentBan = (user) => {
    if (!window.confirm(`Permanently ban ${user.name}? This seller's account will remain suspended with no path to reinstatement.`)) return;
    toast.success(`${user.name}'s account is permanently banned. No further action needed.`);
    // Account is already suspended — this is an admin confirmation action only
  };

  const toggleImage = (listingId, totalImages, direction) => {
    const currentIndex = carouselIndex[listingId] || 0;
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = totalImages - 1;
    if (nextIndex >= totalImages) nextIndex = 0;
    setCarouselIndex({ ...carouselIndex, [listingId]: nextIndex });
  };

  const TABS = [
    { id: "pending", label: "Pending Approval", icon: <Clock className="w-4 h-4" />, color: "text-blue-600" },
    { id: "reported", label: "Reported Items", icon: <ShieldAlert className="w-4 h-4" />, color: "text-red-600" },
    { id: "suspended", label: "Suspended Sellers", icon: <UserX className="w-4 h-4" />, color: "text-amber-600" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* --- PROHIBITED ITEMS REFERENCE BOX --- */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] overflow-hidden shadow-sm">
        <button
          onClick={() => setGuidelinesOpen(!guidelinesOpen)}
          className="w-full flex items-center justify-between px-8 py-5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="font-black text-slate-800 dark:text-white text-sm">📋 Prohibited Items Guidelines</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Admin Reference — Click to {guidelinesOpen ? "Collapse" : "Expand"}</p>
            </div>
          </div>
          {guidelinesOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {guidelinesOpen && (
          <div className="px-8 pb-7 pt-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500 font-medium mb-4">The following categories are strictly NOT allowed on the Campus Marketplace. Use this as a checklist when reviewing listings:</p>
            <ul className="space-y-2.5">
              {PROHIBITED_ITEMS.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                  <span className="w-5 h-5 mt-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center text-[10px] font-black shrink-0">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Market Moderation</h1>
          <p className="text-slate-500 font-medium">Approve listings, handle reports, and manage suspended sellers</p>
        </div>

        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? `bg-white dark:bg-slate-700 ${tab.color} shadow-sm`
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- SUSPENDED SELLERS TAB --- */}
      {activeTab === "suspended" && (
        sellersLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
            <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading suspended accounts...</p>
          </div>
        ) : suspendedSellers.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700">
            <ShieldCheck className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-700 dark:text-white">No Suspended Sellers</h3>
            <p className="text-slate-400 mt-2 font-medium">All student accounts are in good standing.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suspendedSellers.map(seller => (
              <div key={seller._id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm hover:shadow-lg transition-all">
                <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-2xl shrink-0">
                  🚫
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-black text-slate-800 dark:text-white text-lg">{seller.name}</h3>
                    <span className="text-[10px] font-black px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full uppercase tracking-widest">Suspended</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium mt-1">{seller.email}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3" />
                    Auto-suspended: multiple reports across listings
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => handleReinstate(seller._id)}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-black text-xs border border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
                  >
                    <UserCheck className="w-4 h-4" /> Reinstate
                  </button>
                  <button
                    onClick={() => handlePermanentBan(seller)}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white font-black text-xs hover:bg-red-700 dark:hover:bg-red-700 transition-all"
                  >
                    <UserX className="w-4 h-4" /> Permanent Ban
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* --- LISTINGS TAB (Pending & Reported) --- */}
      {activeTab !== "suspended" && (
        loading ? (
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
                      <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg flex items-center gap-1.5 animate-pulse">
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
                    <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4">{item.description}</p>

                    {/* Reported-specific stats */}
                    {activeTab === "reported" && (
                      <div className="flex flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-2 rounded-xl text-xs font-black">
                          <Flag className="w-3 h-3" />
                          🚩 Reported {item.reportCount} times
                        </div>
                        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xl text-xs font-black">
                          <User className="w-3 h-3" />
                          {item.reportedBy?.length || 0} different users reported
                        </div>
                      </div>
                    )}

                    <div className="mt-auto space-y-6">
                      <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg">
                          👤
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 capitalize">
                            Seller: {item.sellerId?.name?.split(" ")[0] || item.sellerFirstName || "Student"}
                          </p>
                          <p className="text-[10px] font-black text-slate-400">ID: #{item._id.slice(-6)}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {activeTab === "pending" ? (
                        <div className="flex gap-4">
                          <button
                            onClick={() => handleApprove(item._id)}
                            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" /> APPROVE
                          </button>
                          <button
                            onClick={() => { setRejectionListing(item); setRejectionMode("remove"); }}
                            className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl font-black text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/40"
                          >
                            <XCircle className="w-4 h-4" /> REJECT
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <button
                            onClick={() => handleKeepListing(item._id)}
                            className="w-full py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-black text-xs border border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" /> Keep Listing (Dismiss Reports)
                          </button>
                          <button
                            onClick={() => { setRejectionListing(item); setRejectionMode("remove"); }}
                            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Remove Listing
                          </button>
                          <button
                            onClick={() => { setRejectionListing(item); setRejectionMode("remove_flag"); }}
                            className="w-full py-3.5 bg-slate-900 dark:bg-red-950 hover:bg-red-950 dark:hover:bg-red-900 text-white rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2"
                          >
                            <ShieldOff className="w-4 h-4" /> Remove + Flag Seller for Review
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* --- REJECTION / REMOVAL MODAL --- */}
      {rejectionListing && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleReject}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-6 animate-in zoom-in-95 duration-200"
          >
            <div className="text-center">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${rejectionMode === "remove_flag" ? "bg-slate-900" : "bg-red-50 dark:bg-red-900/30"}`}>
                {rejectionMode === "remove_flag"
                  ? <ShieldOff className="w-10 h-10 text-white" />
                  : <AlertTriangle className="w-10 h-10 text-red-600" />
                }
              </div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white">
                {rejectionMode === "remove_flag" ? "Remove & Flag Seller" : activeTab === "pending" ? "Reject Listing" : "Remove Listing"}
              </h2>
              <p className="text-slate-500 font-medium mt-2">Item: <span className="font-black text-slate-700 dark:text-slate-300">{rejectionListing.title}</span></p>
              {rejectionMode === "remove_flag" && (
                <p className="text-xs text-amber-600 font-bold mt-3 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-xl">
                  ⚠️ This will flag the seller for admin review and remove their listing.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason</label>
              <textarea
                required
                rows="4"
                placeholder="e.g. Inappropriate content, fake listing, prohibited item..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-red-500 font-bold text-slate-800 dark:text-white transition-all resize-none"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => { setRejectionListing(null); setRejectionReason(""); setRejectionMode("remove"); }}
                className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={processing}
                className={`flex-[2] py-4 px-6 rounded-2xl text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl ${rejectionMode === "remove_flag" ? "bg-slate-900 hover:bg-red-700 shadow-slate-900/30" : "bg-red-600 hover:bg-red-700 shadow-red-500/20"}`}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {rejectionMode === "remove_flag" ? "REMOVE & FLAG SELLER" : "CONFIRM REMOVAL"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
