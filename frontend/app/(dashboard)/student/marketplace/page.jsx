"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Tag, 
  MessageCircle, 
  Image as ImageIcon, 
  X, 
  Loader2,
  ChevronRight,
  ArrowRight,
  ShoppingCart,
  ShieldCheck,
  ChevronRight as ChevronRightIcon,
  Navigation,
  User,
  CheckCircle,
  Flag
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/auth.store";
import { getNamespace } from "@/config/socket";

const CATEGORIES = [
  { id: "", label: "All Items", icon: "💎" },
  { id: "books", label: "Books", icon: "📚" },
  { id: "electronics", label: "Electronics", icon: "💻" },
  { id: "stationery", label: "Stationery", icon: "✏️" },
  { id: "cycles", label: "Cycles", icon: "🚲" },
  { id: "hostel_items", label: "Hostel Gear", icon: "🏠" },
  { id: "clothing", label: "Clothing", icon: "👕" },
];

const CONDITION_BADGES = {
  new: { label: "New", icon: "🆕", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  like_new: { label: "Like New", icon: "✨", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  used: { label: "Used", icon: "📦", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  heavily_used: { label: "Heavily Used", icon: "🔧", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" }
};

export default function MarketplacePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [showMyListings, setShowMyListings] = useState(false);

  // 1. Fetch Listings
  const fetchListings = async () => {
    setLoading(true);
    try {
      const endpoint = showMyListings ? "/api/listings/mine/with-deal-status" : "/api/listings";
      const params = showMyListings ? {} : {
        category: activeCategory || undefined,
        search: search || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined
      };
      
      const { data } = await api.get(endpoint, { params });
      setListings(data.data);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(fetchListings, 500); // Debounce search
    return () => clearTimeout(timeout);
  }, [activeCategory, search, minPrice, maxPrice, showMyListings]);

  // Listen for new marketplace items
  useEffect(() => {
    if (!user) return;
    const notificationsNs = getNamespace("/notifications");
    
    const handleNotification = (payload) => {
      if (payload.type === "marketplace_update" || payload.type === "listing_approved") {
        fetchListings();
      }
    };
    
    notificationsNs.on("notification_push", handleNotification);
    
    return () => {
      notificationsNs.off("notification_push", handleNotification);
    };
  }, [user]);

  // 2. Chat Handler
  const startChat = async (listingId) => {
    try {
      const { data } = await api.post("/api/chat/rooms", { listingId });
      router.push(`/student/marketplace/chat/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not start chat");
    }
  };

  // 3. (Removed direct Mark as Sold, now must be done via Chat)

  // 4. Report Handler
  const reportItem = async (id) => {
    if (!window.confirm("Are you sure you want to report this listing as suspicious?")) return;
    try {
      await api.post(`/api/listings/${id}/report`);
      toast.success("Listing reported to admins.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to report listing");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* --- HERO / SEARCH --- */}
      <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Campus Marketplace</h1>
          <p className="text-slate-400 font-medium mb-8">Buy and sell pre-loved items within the trusted campus community.</p>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input 
                type="text"
                placeholder="Search for books, cycles, laptops..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800 border-none rounded-2xl py-5 pl-14 pr-6 font-bold text-white focus:ring-2 focus:ring-blue-500 transition-all shadow-2xl"
              />
            </div>
            <button 
              onClick={() => setShowMyListings(!showMyListings)} 
              className={`font-black px-10 py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 ${
                showMyListings 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20' 
                  : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md'
              }`}
            >
              <User className="w-5 h-5" /> {showMyListings ? 'BROWSE ALL' : 'MY LISTINGS'}
            </button>
            <button 
              onClick={() => router.push('/student/marketplace/sell')} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <Tag className="w-5 h-5" /> SELL ITEM
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none hidden lg:block" />
        <Navigation className="absolute -bottom-10 -right-10 w-60 h-60 text-white/5 -rotate-12" />
      </div>

      {/* --- FILTERS --- */}
      <div className="overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-4">
          {CATEGORIES.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-sm whitespace-nowrap transition-all border ${
                activeCategory === cat.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600'
              }`}
            >
              <span className="text-lg">{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- GRID --- */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-[2.5rem] h-[400px] animate-pulse border border-slate-100 dark:border-slate-700" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700">
           <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-6" />
           <h3 className="text-2xl font-black text-slate-700 dark:text-white">No Items Found</h3>
           <p className="text-slate-400 mt-2 font-medium">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {listings.map((item) => (
            <div 
              key={item._id}
              onClick={() => { setSelectedListing(item); setCurrentImgIndex(0); }}
              className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden group hover:shadow-2xl transition-all cursor-pointer flex flex-col"
            >
              <div className="aspect-[4/5] relative overflow-hidden">
                {/* Bug fix: model uses images[] array, not image */}
                <img src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                {item.condition && CONDITION_BADGES[item.condition] && (
                  <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md ${CONDITION_BADGES[item.condition].color}`}>
                    {CONDITION_BADGES[item.condition].icon}
                  </div>
                )}
                <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
                  <span className="bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                    {item.category.toUpperCase()}
                  </span>
                  {showMyListings && item.status !== "approved" && (
                    <span className={`backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg ${
                      item.status === 'pending' ? 'bg-amber-500/90' : 
                      item.status === 'rejected' ? 'bg-red-500/90' : 
                      'bg-slate-500/90'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  )}
                  {showMyListings && item.hasPendingConfirmation && (
                    <span className="bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                      ⏳ SALE PENDING
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6 flex flex-col items-center text-center">
                <h3 className="font-black text-slate-800 dark:text-white text-lg line-clamp-1">{item.title}</h3>
                <p className="text-blue-600 font-black text-xl mt-1">₹{item.price}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3">
                  {/* Bug fix: backend populates sellerId.name, not sellerFirstName */}
                  <ShieldCheck className="w-3 h-3 text-blue-500" /> Seller: {item.sellerId?.name?.split(' ')[0]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- DETAIL MODAL --- */}
      {selectedListing && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row relative animate-in zoom-in-95 duration-300">
            
            {/* Image Section */}
            <div className="lg:w-1/2 h-80 lg:h-[650px] relative bg-slate-100 dark:bg-slate-800">
              <img 
                src={selectedListing.images[currentImgIndex]} 
                alt={selectedListing.title} 
                className="w-full h-full object-contain p-4"
              />
              
              {selectedListing.images.length > 1 && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 px-4 py-3 bg-black/20 backdrop-blur-md rounded-2xl">
                  {selectedListing.images.map((_, i) => (
                    <button 
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(i); }}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${currentImgIndex === i ? 'bg-white w-6' : 'bg-white/40'}`}
                    />
                  ))}
                </div>
              )}
              
              <button 
                onClick={() => setSelectedListing(null)}
                className="lg:hidden absolute top-6 right-6 p-3 bg-black/40 text-white rounded-full backdrop-blur-md"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Info Section */}
            <div className="lg:w-1/2 p-10 md:p-16 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                   <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-4 py-1.5 rounded-full uppercase tracking-widest">
                     Verified Student Listing
                   </span>
                   <button 
                    onClick={() => setSelectedListing(null)}
                    className="hidden lg:block text-slate-300 hover:text-slate-600 transition-colors"
                   >
                     <X className="w-8 h-8" />
                   </button>
                </div>
                
                <div className="flex justify-between items-start mt-4">
                  <h2 className="text-4xl font-black text-slate-800 dark:text-white">{selectedListing.title}</h2>
                  {selectedListing.sellerId?._id !== user?._id && selectedListing.sellerId !== user?._id && (
                    <button 
                      onClick={() => reportItem(selectedListing._id)}
                      className="flex items-center gap-2 text-[10px] font-black text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-full uppercase tracking-widest transition-colors shrink-0"
                      title="Report suspicious listing"
                    >
                      <Flag className="w-3 h-3" /> Report
                    </button>
                  )}
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-black text-blue-600">₹{selectedListing.price}</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-xs uppercase tracking-widest">
                        {selectedListing.category}
                      </span>
                      {selectedListing.condition && CONDITION_BADGES[selectedListing.condition] && (
                        <span className={`font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-widest flex items-center gap-1 ${CONDITION_BADGES[selectedListing.condition].color}`}>
                          {CONDITION_BADGES[selectedListing.condition].icon} {CONDITION_BADGES[selectedListing.condition].label}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedListing.interestedCount > 0 && (
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-3">
                      👥 {selectedListing.interestedCount} people interested
                    </span>
                  )}
                </div>

                <div className="mt-10 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condition & Description</h4>
                  <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-lg">
                    {selectedListing.description}
                  </p>
                </div>
              </div>

              <div className="mt-12 space-y-6">
                 <div className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl">
                       👤
                    </div>
                    <div>
                       <h4 className="font-black text-slate-800 dark:text-white">Listed by {selectedListing.sellerId?.name?.split(' ')[0]}</h4>
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Verified Campus Member</p>
                    </div>
                 </div>

                 {selectedListing.sellerId?._id === user?._id || selectedListing.sellerId === user?._id ? (
                   <button 
                     disabled
                     className="w-full py-6 rounded-[2rem] bg-slate-200 dark:bg-slate-800 text-slate-500 font-black text-xl transition-all flex items-center justify-center gap-3 cursor-not-allowed"
                   >
                     <ShieldCheck className="w-7 h-7" /> {selectedListing.status === "sold" ? "ITEM SOLD" : "MARK SOLD IN CHAT"}
                   </button>
                 ) : (
                   <button 
                    onClick={() => startChat(selectedListing._id)}
                    className="w-full py-6 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-xl transition-all shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-[0.98]"
                   >
                     <MessageCircle className="w-7 h-7" /> CONTACT SELLER
                   </button>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
