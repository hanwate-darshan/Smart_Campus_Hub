"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Loader2, Search, MapPin, Calendar, Maximize2, X, Archive, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminLostFoundPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState("all");

  const fetchItems = async () => {
    try {
      setLoading(true);
      const url = filter === "all" ? "/api/lost-found" : `/api/lost-found?status=${filter}`;
      const { data } = await api.get(url);
      setItems(data.data);
    } catch (err) {
      toast.error("Failed to load lost & found items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filter]);

  const getStatusBadge = (status) => {
    switch(status) {
      case "pending": return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-bold uppercase">Pending Verification</span>;
      case "in_office": return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-bold uppercase">In Office</span>;
      case "returned": return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full text-xs font-bold uppercase">Returned</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e8eaed]">Lost & Found Directory</h1>
          <p className="text-sm text-[#9aa0a6] mt-1">Monitor all items reported lost or found across the campus.</p>
        </div>
        
        <div className="flex bg-[#1e1f20] p-1 rounded-xl border border-[#3c4043]">
          {['all', 'pending', 'in_office', 'returned'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === status ? 'bg-[#282a2c] text-[#8ab4f8]' : 'text-[#9aa0a6] hover:text-[#e8eaed]'}`}
            >
              {status === 'all' ? 'All Items' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#8ab4f8] animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1e1f20] rounded-2xl border border-[#3c4043]">
          <Archive className="w-12 h-12 text-[#5f6368] mb-4" />
          <h3 className="text-lg font-bold text-[#e8eaed]">No Items Found</h3>
          <p className="text-[#9aa0a6] mt-1">There are no items matching this status.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div 
              key={item._id}
              className="bg-[#1e1f20] rounded-2xl border border-[#3c4043] overflow-hidden hover:border-[#5f6368] transition-all cursor-pointer group"
              onClick={() => setSelectedItem(item)}
            >
              <div className="aspect-square relative overflow-hidden bg-[#131314]">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3">
                   {getStatusBadge(item.status)}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[#e8eaed] truncate">{item.title}</h3>
                <div className="flex items-center gap-2 text-xs text-[#9aa0a6] mt-2">
                   <MapPin className="w-3.5 h-3.5" /> Found: {item.locationFound}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#9aa0a6] mt-1">
                   <Calendar className="w-3.5 h-3.5" /> {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-[#1e1f20] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-[#3c4043] animate-in zoom-in-95 duration-200">
              <div className="md:w-1/2 h-64 md:h-[400px] relative bg-[#131314]">
                 <img src={selectedItem.imageUrl} alt={selectedItem.title} className="w-full h-full object-contain" />
              </div>
              <div className="md:w-1/2 p-6 flex flex-col relative">
                 <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-[#9aa0a6] hover:text-[#e8eaed]"><X className="w-5 h-5" /></button>
                 
                 <div className="mb-4">
                    {getStatusBadge(selectedItem.status)}
                 </div>
                 <h2 className="text-xl font-bold text-[#e8eaed]">{selectedItem.title}</h2>
                 
                 <div className="space-y-3 mt-6 flex-1">
                    <div>
                       <p className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">Location Found</p>
                       <p className="text-[#e8eaed] text-sm mt-0.5">{selectedItem.locationFound}</p>
                    </div>
                    <div>
                       <p className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">Description</p>
                       <p className="text-[#9aa0a6] text-sm mt-0.5">{selectedItem.description}</p>
                    </div>
                    <div>
                       <p className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">Reported By</p>
                       <p className="text-[#e8eaed] text-sm mt-0.5">{selectedItem.reportedBy?.name || "Unknown"} <span className="text-[#9aa0a6]">({selectedItem.reportedBy?.phone})</span></p>
                    </div>
                 </div>

                 {selectedItem.status === 'returned' && selectedItem.returnedTo && (
                   <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                     <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Returned To</p>
                     <p className="text-blue-300 text-sm">{selectedItem.returnedTo.name} ({selectedItem.returnedTo.phone})</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
