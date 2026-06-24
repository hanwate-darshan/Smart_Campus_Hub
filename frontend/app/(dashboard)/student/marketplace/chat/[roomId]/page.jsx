"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  CheckCheck, 
  Lock, 
  Info,
  Package,
  ExternalLink,
  User,
  MoreVertical
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import api from "@/lib/api";
import useAuthStore from "@/store/auth.store";

const SOCKET_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/chat`;

export default function ChatViewPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const getLastActiveStatus = (lastActiveAt) => {
    if (!lastActiveAt) return null;
    const diffInMs = new Date() - new Date(lastActiveAt);
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins <= 10) return { text: "Active now", active: true };
    if (diffInHours < 24) return { text: `Active ${diffInHours || 1} hour${diffInHours > 1 ? 's' : ''} ago`, active: false };
    return { text: `Active ${diffInDays || 1} day${diffInDays > 1 ? 's' : ''} ago`, active: false };
  };

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Fetch Room and Messages
  const fetchData = async () => {
    try {
      const msgRes = await api.get(`/api/chat/rooms/${roomId}/messages`);
      setRoom(msgRes.data.room);
      setMessages(msgRes.data.data);
    } catch (err) {
      toast.error("Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket Setup
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    socketRef.current = io(SOCKET_URL, { auth: { token } });

    socketRef.current.emit("join_room", { roomId });

    socketRef.current.on("message_new", (msg) => {
      setMessages(prev => [...prev, msg]);
      // Auto-read if we are in the room
      socketRef.current.emit("message_read", { roomId });
    });

    socketRef.current.on("user_typing", (data) => {
      if (data.roomId === roomId) setOtherUserTyping(true);
    });

    socketRef.current.on("user_stopped_typing", (data) => {
      if (data.roomId === roomId) setOtherUserTyping(false);
    });

    socketRef.current.on("messages_read", (data) => {
      if (data.roomId === roomId) {
        setMessages(prev => prev.map(m => ({
          ...m,
          readBy: m.readBy?.includes(data.readBy) ? m.readBy : [...(m.readBy || []), data.readBy]
        })));
      }
    });

    socketRef.current.on("error", (msg) => toast.error(msg));

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [roomId]);

  // 2. Auto Scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherUserTyping]);

  // 3. Handlers
  const handleTyping = (e) => {
    setInput(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit("typing_start", { roomId });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current.emit("typing_stop", { roomId });
    }, 2000);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || room?.isLocked) return;

    socketRef.current.emit("message_send", { roomId, content: input.trim() });
    setInput("");
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      setIsTyping(false);
      socketRef.current.emit("typing_stop", { roomId });
    }
  };

  const currentUserId = user?.id || user?._id;
  const isSeller = String(room?.listingSellerId) === String(currentUserId);
  const showReminderBanner = room?.type === 'marketplace' && !room?.isLocked;
  
  console.log("Chat Banner Debug:", {
    listingSellerId: room?.listingSellerId,
    currentUserId,
    isSeller,
    type: room?.type,
    isLocked: room?.isLocked,
    status: room?.listingStatus,
    showReminderBanner
  });

  const handleMarkAsSold = async () => {
    if (!room?.listingId) return;
    try {
      await api.patch(`/api/listings/${room.listingId}/sold`);
      toast.success("Listing marked as sold!");
      setRoom(prev => ({ ...prev, isLocked: true, listingStatus: 'sold' }));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to mark as sold");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">Connecting to secure tunnel...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative">
      
      {/* --- TOP BAR --- */}
      <header className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => router.back()}
            className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
             <h2 className="font-black text-slate-800 dark:text-white text-lg flex items-center gap-2">
               {room?.otherParticipantName}
               {room?.otherParticipantLastActive && getLastActiveStatus(room.otherParticipantLastActive)?.active && (
                 <span className="w-2 h-2 rounded-full bg-emerald-500" />
               )}
             </h2>
             <div className="flex items-center gap-3 mt-0.5">
               <p className="text-xs text-blue-600 font-bold uppercase tracking-tighter flex items-center gap-1">
                 <Package className="w-3 h-3" /> Re: {room?.listingTitle}
               </p>
               {room?.otherParticipantLastActive && (
                 <p className={`text-[10px] font-bold ${getLastActiveStatus(room.otherParticipantLastActive).active ? 'text-emerald-500' : 'text-slate-400'}`}>
                   • {getLastActiveStatus(room.otherParticipantLastActive).text}
                 </p>
               )}
             </div>
          </div>
        </div>
        <button className="p-2.5 text-slate-400">
           <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* --- SECURITY BANNER --- */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/30 px-6 py-3 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-800 dark:text-amber-500">Safety First: Always meet inside the campus.</p>
          <p className="text-xs font-medium text-amber-700/80 dark:text-amber-500/80 mt-0.5">Do not make online payments before receiving the item. Transactions are offline only.</p>
        </div>
      </div>

      {/* --- DEAL REMINDER BANNER --- */}
      {showReminderBanner && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-800 dark:text-blue-400">Did you complete this deal?</p>
              <p className="text-xs font-medium text-blue-700/80 dark:text-blue-400/80 mt-0.5">
                {isSeller 
                  ? "If the item is handed over, please mark it as sold to close the listing."
                  : "If you bought this item, please remind the seller to mark it as sold."}
              </p>
            </div>
          </div>
          {isSeller && (
            <button
              onClick={handleMarkAsSold}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0"
            >
              Mark as Sold
            </button>
          )}
        </div>
      )}

      {/* --- MESSAGE AREA --- */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
        {messages.map((msg, index) => {
          const userId = user?.id || user?._id;
          const isOwn = msg.senderId === userId || msg.senderId?._id === userId;
          const showDate = index === 0 || new Date(messages[index-1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
          
          return (
            <div key={msg._id || index} className="space-y-4">
              {showDate && (
                <div className="flex justify-center my-6">
                   <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-black rounded-full uppercase tracking-widest">
                      {new Date(msg.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                   </span>
                </div>
              )}
              <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-6 py-4 rounded-[2rem] font-medium text-sm shadow-sm ${
                    isOwn 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-[10px] text-slate-400 font-bold">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOwn && (
                      <CheckCheck className={`w-3 h-3 ${msg.readBy?.length > 1 ? 'text-blue-500' : 'text-slate-300'}`} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {otherUserTyping && (
          <div className="flex justify-start animate-pulse">
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-full text-xs font-black text-slate-400 italic flex items-center gap-2">
               <div className="flex gap-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-75" />
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-150" />
               </div>
               {room?.otherParticipantName} is typing...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* --- INPUT AREA --- */}
      <footer className="p-6 bg-white dark:bg-slate-900">
        {room?.isLocked ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-3xl flex items-center gap-4 text-red-600 dark:text-red-400">
             <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
             </div>
             <div>
                <p className="text-sm font-black uppercase tracking-tight">This chat has been closed</p>
                <p className="text-[10px] font-medium opacity-80">This item has been sold or removed by the seller.</p>
             </div>
          </div>
        ) : (
          <form 
            onSubmit={sendMessage}
            className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 pl-6 rounded-[2rem] shadow-inner focus-within:ring-2 focus-within:ring-blue-500 transition-all"
          >
            <input 
              type="text"
              placeholder="Ask about pricing, location, etc..."
              value={input}
              onChange={handleTyping}
              className="flex-1 bg-transparent border-none py-4 font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-0"
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="w-14 h-14 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all active:scale-90"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>
        )}
        <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
               <ShieldCheck className="w-3 h-3 text-emerald-500" /> End-to-end Encrypted Campus Tunnel
            </div>
        </div>
      </footer>
    </div>
  );
}

function ShieldCheck(props) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
}
