"use client";

import { useState, useEffect } from "react";
import { 
  CheckCheck, 
  Trash2, 
  Bell, 
  BellOff, 
  Loader2, 
  Calendar,
  AlertTriangle,
  MessageSquare,
  HelpCircle,
  Package,
  TrendingUp,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

const TYPE_ICONS = {
  sos_alert: <AlertTriangle className="text-red-500" />,
  sos_update: <TrendingUp className="text-blue-500" />,
  complaint_update: <TrendingUp className="text-amber-500" />,
  listing_approved: <Package className="text-emerald-500" />,
  listing_rejected: <Trash2 className="text-red-400" />,
  roommate_request: <HelpCircle className="text-indigo-500" />,
  new_message: <MessageSquare className="text-blue-400" />,
  default: <Bell className="text-slate-400" />
};

export default function NotificationList() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = async (isNew = false) => {
    try {
      if (isNew) setLoading(true);
      const currentPage = isNew ? 1 : page;
      const { data } = await api.get(`/api/notifications?page=${currentPage}&limit=20`);
      
      if (isNew) {
        setNotifications(data.data);
      } else {
        setNotifications((prev) => [...prev, ...data.data]);
      }
      
      setHasMore(data.data.length === 20);
      setPage(currentPage + 1);
    } catch (err) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch("/api/notifications/mark-all-read");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All caught up!");
      // Dispatch event for bell to update UI
      window.dispatchEvent(new Event('notifications_read'));
    } catch (err) {
      toast.error("Failed to mark as read");
    }
  };

  const markAsRead = async (id, link) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      window.dispatchEvent(new Event('notifications_read'));
      if (link) router.push(link);
    } catch (err) {}
  };

  if (loading && page === 1) return (
    <div className="flex flex-col items-center justify-center py-40">
       <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
       <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Retrieving history...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      <div className="flex items-center justify-between">
         <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Notifications</h1>
            <p className="text-slate-500 font-medium">Keep track of all your campus activities.</p>
         </div>
         {notifications.some(n => !n.isRead) && (
           <button 
             onClick={markAllRead}
             className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-600 hover:text-blue-600 transition-all shadow-sm"
           >
              <CheckCheck className="w-4 h-4" /> MARK ALL AS READ
           </button>
         )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-32 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
           <BellOff className="w-16 h-16 text-slate-100 dark:text-slate-700 mx-auto mb-6" />
           <h3 className="text-2xl font-black text-slate-700 dark:text-white">You're All Caught Up</h3>
           <p className="text-slate-400 mt-2 font-medium">Any new updates will appear right here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div 
              key={n._id}
              onClick={() => markAsRead(n._id, n.link)}
              className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex gap-5 group items-start ${n.isRead ? 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 opacity-80' : 'bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900 shadow-lg shadow-blue-500/5'}`}
            >
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform ${n.isRead ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-400' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                  {TYPE_ICONS[n.type] || TYPE_ICONS.default}
               </div>

               <div className="flex-1 space-y-1 pr-10">
                  <div className="flex items-center gap-3">
                     <h4 className={`text-lg font-black tracking-tight ${n.isRead ? 'text-slate-600 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                        {n.title}
                     </h4>
                     {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                  </div>
                  <p className={`text-sm font-medium leading-relaxed ${n.isRead ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                     {n.message}
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                     <Calendar className="w-3 h-3" />
                     {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </div>
               </div>

               {n.link && (
                 <div className="self-center p-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                    <ChevronRight className="w-5 h-5" />
                 </div>
               )}
            </div>
          ))}

          {hasMore && (
            <button 
              onClick={() => fetchNotifications()}
              className="w-full py-6 text-slate-400 hover:text-blue-600 font-black text-xs uppercase tracking-widest transition-all"
            >
               LOAD MORE ACTIVITY
            </button>
          )}
        </div>
      )}
    </div>
  );
}
