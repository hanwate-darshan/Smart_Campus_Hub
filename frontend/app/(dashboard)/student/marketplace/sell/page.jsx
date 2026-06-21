"use client";

import { useState } from "react";
import { 
  Camera, 
  Tag, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Plus
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { id: "books", label: "Books" },
  { id: "electronics", label: "Electronics" },
  { id: "stationery", label: "Stationery" },
  { id: "cycles", label: "Cycles" },
  { id: "hostel_items", label: "Hostel Gear" },
  { id: "clothing", label: "Clothing" },
  { id: "other", label: "Other" },
];

const CONDITIONS = [
  { id: "new", label: "New (never used)", icon: "🆕" },
  { id: "like_new", label: "Like New (barely used)", icon: "✨" },
  { id: "used", label: "Used (normal wear)", icon: "📦" },
  { id: "heavily_used", label: "Heavily Used (visible wear)", icon: "🔧" }
];

export default function SellItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "books",
    condition: ""
  });
  const [duplicateWarning, setDuplicateWarning] = useState("");

  const handleTitleBlur = async () => {
    if (!formData.title || formData.title.length < 3) return;
    try {
      const res = await api.post("/api/listings/check-duplicate", { title: formData.title });
      if (res.data?.data?.isDuplicate) {
        setDuplicateWarning(`⚠️ You already have a similar listing: '${res.data.data.similarListing}'. Are you sure you want to post this too?`);
      } else {
        setDuplicateWarning("");
      }
    } catch (err) {
      console.error("Duplicate check failed", err);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files
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

    if (images.length + validFiles.length > 3) {
      return toast.error("Maximum 3 images allowed");
    }

    setImages(prev => [...prev, ...validFiles]);
    
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0) return toast.error("At least one image is required");
    if (!formData.condition) return toast.error("Please select an item condition");

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("price", formData.price);
    data.append("category", formData.category);
    data.append("condition", formData.condition);
    images.forEach(img => data.append("images", img));

    setLoading(true);
    try {
      await api.post("/api/listings", data);
      toast.success("Listing submitted for approval!");
      router.push("/student/marketplace");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="flex items-center gap-6 mb-12">
        <button 
          onClick={() => router.back()}
          className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
           <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Sell an Item</h1>
           <p className="text-slate-500 font-medium">Clear out your clutter and earn some extra cash.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 md:p-16 border border-slate-100 dark:border-slate-700 shadow-xl space-y-12">
        
        {/* --- IMAGES --- */}
        <div className="space-y-4">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Photo Gallery (Max 3)</label>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {previews.map((src, i) => (
                <div key={i} className="aspect-square relative rounded-3xl overflow-hidden group">
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
              {previews.length < 3 && (
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group">
                  <Camera className="w-10 h-10 text-slate-300 group-hover:text-blue-500" />
                  <span className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-tighter">Add Photo</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
           </div>
           <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center gap-3 text-[10px] font-bold text-blue-600">
              <AlertCircle className="w-4 h-4" /> Clear, high-quality photos help items sell faster.
           </div>
        </div>

        {/* --- DETAILS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Title</label>
                 <input 
                   required
                   type="text"
                   value={formData.title}
                   onChange={e => setFormData({...formData, title: e.target.value})}
                   onBlur={handleTitleBlur}
                   className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 font-bold"
                   placeholder="e.g. Concise Physics - 10th Ed"
                 />
                 {duplicateWarning && (
                   <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 text-xs font-bold rounded-xl mt-2 flex items-start gap-2">
                     <AlertCircle className="w-4 h-4 shrink-0" />
                     {duplicateWarning}
                   </div>
                 )}
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₹)</label>
                 <input 
                   required
                   type="number"
                   value={formData.price}
                   onChange={e => setFormData({...formData, price: e.target.value})}
                   className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 font-bold"
                   placeholder="e.g. 250"
                 />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
              <div className="grid grid-cols-2 gap-3">
                 {CATEGORIES.map(cat => (
                   <button 
                     key={cat.id}
                     type="button"
                     onClick={() => setFormData({...formData, category: cat.id})}
                     className={`py-3 px-4 rounded-xl text-[10px] font-black transition-all border ${formData.category === cat.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-transparent'}`}
                   >
                     {cat.label.toUpperCase()}
                   </button>
                 ))}
              </div>
           </div>
        </div>

        {/* --- CONDITION --- */}
        <div className="space-y-4">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Condition</label>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CONDITIONS.map(cond => (
                <button 
                  key={cond.id}
                  type="button"
                  onClick={() => setFormData({...formData, condition: cond.id})}
                  className={`p-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 transition-all text-center ${
                    formData.condition === cond.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 shadow-sm' 
                      : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  <span className="text-2xl">{cond.icon}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{cond.label}</span>
                </button>
              ))}
           </div>
        </div>

        <div className="space-y-2">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Description</label>
           <textarea 
             required
             rows="5"
             value={formData.description}
             onChange={e => setFormData({...formData, description: e.target.value})}
             className="w-full px-6 py-4 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-600 leading-relaxed resize-none"
             placeholder="Include details like usage period, condition, or extras included..."
           />
        </div>

        <div className="pt-6">
           <button 
             type="submit"
             disabled={loading}
             className="w-full py-6 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-xl shadow-2xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 disabled:bg-slate-300 active:scale-[0.98]"
           >
             {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Plus className="w-7 h-7" />}
             SUBMIT LISTING
           </button>
           <p className="text-center text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-widest">
              An administrator will review your listing before it goes live.
           </p>
        </div>

      </form>
    </div>
  );
}
