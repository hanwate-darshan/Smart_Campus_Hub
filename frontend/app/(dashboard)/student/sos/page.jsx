"use client";

import { useState, useEffect, useRef } from "react";
import { 
  AlertTriangle, 
  X, 
  MapPin, 
  Clock, 
  User, 
  CheckCircle2, 
  ShieldAlert,
  Loader2,
  Navigation
} from "lucide-react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import api from "@/lib/api";
import useAuthStore from "@/store/auth.store";

const SOS_NAMESPACE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/sos`;

export default function StudentSOSPage() {
  const { user } = useAuthStore();
  
  // States: inactive, activating, active, resolved
  const [sosStatus, setSosStatus] = useState("inactive");
  const [activeSOS, setActiveSOS] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  
  // Internal refs
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const pressTimerRef = useRef(null);
  const locationUpdateIntervalRef = useRef(null);

  // 1. CLEANUP ON UNMOUNT
  useEffect(() => {
    return () => {
      stopTracking();
      if (socketRef.current) socketRef.current.disconnect();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (locationUpdateIntervalRef.current) clearInterval(locationUpdateIntervalRef.current);
    };
  }, []);

  // 2. SOCKET INITIALIZATION (When SOS is active)
  useEffect(() => {
    if (sosStatus === "active" && !socketRef.current) {
      const token = localStorage.getItem("accessToken");
      socketRef.current = io(SOS_NAMESPACE, {
        auth: { token }
      });

      socketRef.current.on("connect", () => {
        console.log("[SOS Socket] Connected");
        if (activeSOS) {
          socketRef.current.emit("join", `sos:${activeSOS._id}`);
        }
      });

      socketRef.current.on("sos_status_update", (payload) => {
        if (payload.status === "resolved") {
          handleResolution();
        } else {
          setActiveSOS(prev => ({ ...prev, ...payload }));
        }
      });

      socketRef.current.on("sos_cancelled", () => {
        toast.error("Emergency session has been closed.");
        setSosStatus("inactive");
        stopTracking();
      });

      socketRef.current.on("connect_error", (err) => {
        console.error("[SOS Socket] Auth Error", err.message);
      });
    }
  }, [sosStatus, activeSOS]);

  // 3. TRACKING & UPDATING
  const startTracking = () => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          setLocation(coords);
          setError(null);
        },
        (err) => {
          console.error("Geolocation Error", err);
          setError("Failed to get your location. Please check browser permissions.");
        },
        { enableHighAccuracy: true }
      );

      // Backend update interval (every 5 seconds)
      locationUpdateIntervalRef.current = setInterval(() => {
        if (socketRef.current && location && activeSOS) {
          socketRef.current.emit("sos_location_update", {
            sosId: activeSOS._id,
            coordinates: location
          });
        }
      }, 5000);
    }
  };

  const stopTracking = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    if (locationUpdateIntervalRef.current) clearInterval(locationUpdateIntervalRef.current);
    watchIdRef.current = null;
  };

  // 4. ACTION HANDLERS
  const handleHoldStart = () => {
    pressTimerRef.current = setTimeout(() => {
      startSOSActivating();
    }, 1000); // 1-second hold
  };

  const handleHoldEnd = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const startSOSActivating = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation([pos.coords.longitude, pos.coords.latitude]);
        setSosStatus("activating");
        setCountdown(5);
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              triggerSOSRequest([pos.coords.longitude, pos.coords.latitude]);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      },
      (err) => {
        toast.error("Location access required for SOS");
      }
    );
  };

  const cancelActivating = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setSosStatus("inactive");
  };

  const triggerSOSRequest = async (currentLocation) => {
    try {
      const { data } = await api.post("/api/sos/trigger", {
        longitude: currentLocation[0],
        latitude: currentLocation[1]
      });

      if (data.success) {
        setActiveSOS(data.data);
        setSosStatus("active");
        setElapsedTime(0);
        timerIntervalRef.current = setInterval(() => {
          setElapsedTime(prev => prev + 1);
        }, 1000);
        startTracking();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to trigger SOS");
      setSosStatus("inactive");
    }
  };

  const handleResolution = () => {
    setSosStatus("resolved");
    stopTracking();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimeout(() => {
      setSosStatus("inactive");
      setActiveSOS(null);
    }, 5000);
  };

  const cancelActiveSOS = async () => {
    if (!activeSOS) return;
    try {
      await api.post(`/api/sos/${activeSOS._id}/cancel`);
      setSosStatus("inactive");
      setActiveSOS(null);
      stopTracking();
      toast.success("SOS Cancelled");
    } catch (err) {
      toast.error("Failed to cancel SOS");
    }
  };

  // Format Time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 5. RENDER LOGIC
  
  // --- STATE 1: INACTIVE ---
  if (sosStatus === "inactive") {
    return (
      <div className="max-w-md mx-auto h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in duration-500">
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-800 flex items-start gap-3 text-left">
          <AlertTriangle className="text-orange-600 dark:text-orange-400 w-6 h-6 shrink-0" />
          <p className="text-sm text-orange-800 dark:text-orange-300 font-medium leading-tight">
            <strong>WARNING:</strong> Only use SOS in real emergencies. Misuse may result in strict disciplinary action.
          </p>
        </div>

        <div className="relative group">
          {/* Pulsing indicator */}
          <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20 scale-110" />
          
          <button
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            onContextMenu={(e) => e.preventDefault()}
            className="relative w-48 h-48 md:w-56 md:h-56 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all duration-300 shadow-2xl flex flex-col items-center justify-center text-white border-8 border-white dark:border-slate-800 active:bg-red-800 select-none cursor-pointer"
          >
            <ShieldAlert className="w-12 h-12 md:w-16 md:h-16 mb-2" />
            <span className="text-4xl md:text-5xl font-black">SOS</span>
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xl font-bold text-slate-800 dark:text-white">Emergency Help</p>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Tap and hold for 1 second to activate</p>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
          <MapPin className="w-4 h-4" />
          Your location will be shared with campus security
        </div>
      </div>
    );
  }

  // --- STATE 1.5: ACTIVATING (Countdown) ---
  if (sosStatus === "activating") {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="text-sm tracking-widest uppercase font-bold text-slate-500 mb-8">SOS Activating in</div>
        <div className="text-[12rem] font-black leading-none mb-12 animate-pulse">{countdown}</div>
        
        <p className="text-lg mb-12 max-w-xs text-slate-400">
          Requesting emergency assistance from campus security hub.
        </p>

        <button
          onClick={cancelActivating}
          className="px-12 py-5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xl border-2 border-white/20 transition-all flex items-center gap-3"
        >
          <X className="w-6 h-6" /> CANCEL
        </button>
      </div>
    );
  }

  // --- STATE 2: ACTIVE SOS ---
  if (sosStatus === "active") {
    const statusConfig = {
      active: { label: "Alerting security...", color: "bg-red-600", text: "text-red-600", icon: <Loader2 className="w-5 h-5 animate-spin"/> },
      assigned: { label: `Security is on the way — ${activeSOS.securityName || "Assigned"}`, color: "bg-orange-500", text: "text-orange-500", icon: <Navigation className="w-5 h-5"/> },
      reached: { label: "Security has reached you", color: "bg-emerald-500", text: "text-emerald-500", icon: <CheckCircle2 className="w-5 h-5"/> },
    };
    
    const { label, color, text, icon } = statusConfig[activeSOS.status] || statusConfig.active;

    return (
      <div className="flex flex-col h-[calc(100vh-140px)] -m-4 sm:-m-6 lg:-m-8">
        <div className={`${color} px-6 py-4 text-white font-black text-center flex items-center justify-center gap-3 shadow-lg z-20`}>
          <ShieldAlert className="w-6 h-6 animate-pulse" />
          <span className="tracking-wider uppercase">SOS ACTIVE — Help is on the way</span>
        </div>

        {/* Live Map Placeholder (Google Maps Style) */}
        <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Iframe for Google Maps Embed (Using mock coordinates) */}
          {location ? (
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight="0"
              marginWidth="0"
              src={`https://maps.google.com/maps?q=${location[1]},${location[0]}&z=16&output=embed&iwloc=near`}
              className="grayscale-[0.5] invert-[0] dark:invert-[0.9] dark:hue-rotate-180"
            ></iframe>
          ) : (
             <div className="w-full h-full flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin" /> Fetching precise location...
             </div>
          )}

          {/* User Location Pulse Overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
             <div className="w-10 h-10 bg-blue-500/20 rounded-full animate-ping" />
             <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg" />
          </div>
        </div>

        {/* Info Panel */}
        <div className="bg-white dark:bg-slate-800 p-6 space-y-6 z-10 shadow-[0_-8px_16px_rgba(0,0,0,0.05)] rounded-t-[32px] -mt-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className={`p-3 rounded-2xl ${color}/10 ${text}`}>
                    {icon}
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</p>
                    <p className="font-bold text-slate-800 dark:text-white capitalize">{label}</p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" /> Duration
                 </p>
                 <p className="font-black text-2xl text-slate-800 dark:text-white">{formatTime(elapsedTime)}</p>
              </div>
           </div>

           {activeSOS.status === "active" && (
             <button
               onClick={cancelActiveSOS}
               className="w-full py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold transition flex items-center justify-center gap-2"
             >
               <X className="w-5 h-5" /> Cancel SOS
             </button>
           )}
           
           {activeSOS.status !== "active" && (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                 <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <User className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-xs font-bold text-blue-600/60 uppercase tracking-widest">Responder</p>
                    <p className="font-bold text-blue-900 dark:text-blue-200">{activeSOS.securityName || "Security Officer"}</p>
                 </div>
                 <a href={`tel:${activeSOS.securityPhone || "911"}`} className="ml-auto w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 005.47 5.47l.772-1.547a1 1 0 011.06-.539l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                 </a>
              </div>
           )}
        </div>
      </div>
    );
  }

  // --- STATE 3: RESOLVED ---
  if (sosStatus === "resolved") {
    return (
      <div className="fixed inset-0 z-[100] bg-blue-600 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-blue-600 mb-8 animate-bounce">
           <CheckCircle2 className="w-16 h-16" />
        </div>
        <h2 className="text-4xl font-black mb-4 tracking-tight">SOS RESOLVED</h2>
        <p className="text-xl text-blue-100 font-medium mb-12">Your emergency has been marked as resolved by security.</p>
        <div className="text-2xl font-bold bg-white/20 px-8 py-3 rounded-full backdrop-blur-sm">Stay safe!</div>
        <p className="mt-12 text-blue-200 text-sm">Returning to dashboard in 5 seconds...</p>
      </div>
    );
  }

  return null;
}
