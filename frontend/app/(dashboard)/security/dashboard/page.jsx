"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  MapPin, 
  Navigation, 
  Phone, 
  User, 
  AlertCircle,
  Bell,
  Power,
  CheckCircle2,
  X,
  Loader2,
  Volume2,
  VolumeX
} from "lucide-react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import api from "@/lib/api";
import useAuthStore from "@/store/auth.store";
import LiveMap from "@/components/LiveMap";

const SOS_NAMESPACE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/sos`;
const SIREN_URL = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";

const getDistanceInMeters = (coord1, coord2) => {
  if (!coord1 || !coord2) return null;
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
};

export default function SecurityDashboardPage() {
  const { user, updateUser } = useAuthStore();
  
  // States
  const [dutyStatus, setDutyStatus] = useState(user?.dutyStatus || "available");
  const [alertSOS, setAlertSOS] = useState(null);
  const [activeSOS, setActiveSOS] = useState(null);
  const [guardLocation, setGuardLocation] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  // Bug #1 Fix: Mirror state in refs so socket callbacks always read fresh values
  // without causing the socket to reconnect on every state change.
  const dutyStatusRef = useRef(dutyStatus);
  const activeSOSRef = useRef(activeSOS);
  const isMutedRef = useRef(isMuted);
  const alertSOSRef = useRef(alertSOS);

  useEffect(() => { dutyStatusRef.current = dutyStatus; }, [dutyStatus]);
  useEffect(() => { activeSOSRef.current = activeSOS; }, [activeSOS]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { alertSOSRef.current = alertSOS; }, [alertSOS]);

  // Refs
  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const watchIdRef = useRef(null);

  // 1. INITIALIZATION: Socket & Audio — runs ONCE on mount only
  useEffect(() => {
    // Initialize Audio
    audioRef.current = new Audio(SIREN_URL);
    audioRef.current.loop = true;

    // Initialize Socket
    socketRef.current = io(SOS_NAMESPACE, {
      auth: (cb) => {
        cb({ token: localStorage.getItem("accessToken") });
      }
    });

    socketRef.current.on("connect", () => {
      console.log("[Security Socket] Connected");
      socketRef.current.emit("join", "security:pool");
    });

    // Listen for new SOS alerts — read from refs to avoid stale closure
    socketRef.current.on("sos_alert", (payload) => {
      if (dutyStatusRef.current !== "offline" && !activeSOSRef.current) {
        setAlertSOS(payload);
        if (!isMutedRef.current) {
          audioRef.current.play().catch(e => console.log("Audio play blocked"));
        }
        if (Notification.permission === "granted") {
          new Notification("🚨 SOS EMERGENCY", {
            body: `${payload.studentName} needs help!`,
            icon: "/favicon.ico"
          });
        }
        toast.error(`🚨 SOS EMERGENCY: ${payload.studentName} needs help!`, { duration: 10000 });
      }
    });

    // Listen for targeted assignment — this guard is the nearest one
    socketRef.current.on("sos_assigned_to_you", (payload) => {
      if (dutyStatusRef.current !== "offline" && !activeSOSRef.current) {
        // Mark as priority so the modal can show a distinct "YOU ARE ASSIGNED" badge
        setAlertSOS({ ...payload, isPriority: true });
        if (!isMutedRef.current) {
          audioRef.current.play().catch(e => console.log("Audio play blocked"));
        }
        if (Notification.permission === "granted") {
          new Notification("🚨 SOS — YOU ARE THE NEAREST GUARD", {
            body: `${payload.studentName} needs your help immediately!`,
            icon: "/favicon.ico"
          });
        }
      }
    });

    // Listen for student location updates — read activeSOS from ref
    socketRef.current.on("sos_location_update", (payload) => {
      if (activeSOSRef.current && activeSOSRef.current.sosId === payload.sosId) {
        setActiveSOS(prev => ({
          ...prev,
          location: { ...prev.location, coordinates: payload.coordinates }
        }));
      }
    });

    // Listen for cancellation — Bug #2 backend now emits "sos_cancelled" correctly
    socketRef.current.on("sos_cancelled", (payload) => {
      if (alertSOSRef.current && alertSOSRef.current.sosId === payload.sosId) {
        setAlertSOS(null);
        audioRef.current.pause();
        toast.error("SOS was cancelled by student");
      }
      if (activeSOSRef.current && activeSOSRef.current.sosId === payload.sosId) {
        setActiveSOS(null);
        setDutyStatus("available");
        toast.error("Active SOS was cancelled by student");
      }
    });

    // "Already handled" — another guard accepted, close this guard's alert
    socketRef.current.on("sos_accepted", (payload) => {
      if (alertSOSRef.current && alertSOSRef.current.sosId === payload.sosId) {
        setAlertSOS(null);
        audioRef.current.pause();
        toast(`✅ Already handled by ${payload.acceptedBy}`, { icon: "🛡️" });
      }
    });

    // Request Notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission();
    }

    // Start Guard Tracking
    startGuardTracking();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (audioRef.current) audioRef.current.pause();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []); // ← Empty deps: socket initializes once, refs keep values fresh

  const startGuardTracking = () => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          setGuardLocation(coords);
          if (socketRef.current) {
            socketRef.current.emit("security_location_update", { 
              coordinates: coords,
              sosId: activeSOSRef.current?.sosId // Send sosId so backend knows who to broadcast to
            });
          }
        },
        null,
        { enableHighAccuracy: true }
      );
    }
  };

  // 2. ACTION HANDLERS
  const toggleDuty = async (newStatus) => {
    // Audio Unlock
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }).catch(() => {});
    }

    try {
      const { data } = await api.patch("/api/security/status", { dutyStatus: newStatus });
      setDutyStatus(newStatus);
      updateUser({ dutyStatus: newStatus });
      toast.success(`You are now ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update duty status");
    }
  };

  const acceptSOS = async () => {
    if (!alertSOS) return;
    try {
      const { data } = await api.patch(`/api/sos/${alertSOS.sosId}/accept`);
      setActiveSOS({ ...alertSOS, status: "assigned" });
      setAlertSOS(null);
      setDutyStatus("busy");
      audioRef.current.pause();
      toast.success("SOS Accepted. Navigating to student...");
      
      // Join specific room
      socketRef.current.emit("join", `sos:${alertSOS.sosId}`);

      // Immediately send our current location since watchPosition might not fire if stationary
      if (guardLocation) {
        socketRef.current.emit("security_location_update", {
          coordinates: guardLocation,
          sosId: alertSOS.sosId
        });
      }
    } catch (err) {
      toast.error("Failed to accept SOS. It might be already assigned.");
      setAlertSOS(null);
      audioRef.current.pause();
    }
  };

  const updateStatus = async (status) => {
    if (status === "fake") {
      const confirmed = window.confirm("Are you sure this is a fake emergency? This will give the student a strike, and 3 strikes result in automatic account suspension.");
      if (!confirmed) return;
    }

    try {
      await api.patch(`/api/sos/${activeSOS.sosId}/status`, { status });
      setActiveSOS(prev => ({ ...prev, status }));
      if (status === "resolved" || status === "fake") {
        setDutyStatus("available");
        setActiveSOS(null);
        toast.success(status === "fake" ? "SOS Marked as Fake." : "SOS Resolved successfully!");
      } else {
        toast.success("Status updated to: " + status);
      }
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const dismissAlert = () => {
    setAlertSOS(null);
    audioRef.current.pause();
  };

  // 3. RENDER HELPERS
  const statuses = [
    { key: "available", label: "Available", color: "bg-emerald-500", icon: <CheckCircle2 className="w-4 h-4" /> },
    { key: "busy", label: "Busy", color: "bg-orange-500", icon: <AlertCircle className="w-4 h-4" /> },
    { key: "offline", label: "Offline", color: "bg-slate-500", icon: <Power className="w-4 h-4" /> },
  ];

  const distance = activeSOS && guardLocation && activeSOS.location?.coordinates
    ? getDistanceInMeters(guardLocation, activeSOS.location.coordinates)
    : null;
  const isClose = distance !== null && distance <= 15;

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* --- HEADER: STATUS & TOGGLES --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-blue-600" /> Security Command Hub
          </h1>
          <p className="text-slate-400 font-medium">Monitoring campus safety in real-time</p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
          {statuses.map((s) => (
            <button
              key={s.key}
              onClick={() => toggleDuty(s.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
                dutyStatus === s.key 
                ? `${s.color} text-white shadow-lg` 
                : "text-slate-500 hover:bg-white/50"
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- MAIN CONTENT: MAP OR IDLE --- */}
      <div className="flex-1 min-h-[500px] relative rounded-[2rem] overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
        {!activeSOS ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center ${dutyStatus === 'available' ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
              <ShieldCheck className="w-16 h-16" />
            </div>
            <div className="max-w-xs">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white capitalize">
                {dutyStatus === 'available' ? "All Clear" : "Currently " + dutyStatus}
              </h2>
              <p className="text-slate-400 mt-2">
                {dutyStatus === 'available' 
                  ? "Standing by for emergency alerts. Keep your GPS active." 
                  : "You are not receiving new alerts right now."}
              </p>
            </div>
            {guardLocation && !alertSOS && (
               <div className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Ready at your current coordinates
               </div>
            )}
            
            {/* INLINE ALERT RENDERING */}
            {alertSOS && (
              <div className={`mt-8 max-w-2xl w-full mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 text-center relative overflow-hidden border-2 ${alertSOS.isPriority ? "border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.2)]" : "border-red-500 shadow-[0_0_40px_rgba(255,0,0,0.2)]"}`}>
                 <div className={`absolute inset-0 animate-pulse ${alertSOS.isPriority ? "bg-amber-500/5" : "bg-red-500/5"}`} />

                 <div className="relative z-10">
                   {alertSOS.isPriority && (
                     <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 font-black text-xs px-3 py-1 rounded-full mb-4 border-2 border-amber-300 animate-pulse">
                       <Navigation className="w-3 h-3" /> YOU ARE ASSIGNED
                     </div>
                   )}

                   <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce ${alertSOS.isPriority ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
                     <ShieldAlert className="w-8 h-8" />
                   </div>

                   <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">
                     {alertSOS.isPriority ? "Respond Immediately!" : "New SOS Emergency!"}
                   </h2>
                   
                   <div className="flex items-center justify-center gap-2 text-xl font-bold text-slate-700 dark:text-slate-200 mb-6">
                      <User className={alertSOS.isPriority ? "text-amber-600" : "text-red-600"} /> {alertSOS.studentName}
                   </div>

                   <div className="flex flex-col md:flex-row gap-4 justify-center">
                      <button
                       onClick={acceptSOS}
                       className={`px-8 py-4 rounded-2xl text-white font-black text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${alertSOS.isPriority ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700"}`}
                      >
                        ACCEPT <Navigation className="animate-pulse w-5 h-5" />
                      </button>
                      <button
                       onClick={dismissAlert}
                       className="px-8 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold transition-all"
                      >
                        DISMISS
                      </button>
                   </div>
                 </div>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE SOS TRACKING VIEW */
          <div className="flex flex-col h-full">
            <div className="bg-orange-500 p-4 text-white font-black text-center flex items-center justify-center gap-2">
               <Navigation className="w-5 h-5 animate-pulse" /> RESPONDING TO SOS: {activeSOS.studentName}
            </div>
            
            <div className="flex-1 bg-slate-200 relative overflow-hidden">
               {activeSOS.location?.coordinates && (
                 <LiveMap 
                   studentLocation={activeSOS.location.coordinates} 
                   guardLocation={guardLocation} 
                 />
               )}
               
               <div className="absolute top-6 left-6 right-6 flex items-start justify-between pointer-events-none z-10">
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-white/20 pointer-events-auto">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Information</p>
                     <h3 className="font-black text-lg text-slate-800 dark:text-white">{activeSOS.studentName}</h3>
                     <a href={`tel:${activeSOS.studentPhone}`} className="mt-2 text-blue-600 font-bold flex items-center gap-2 p-2 bg-blue-50 rounded-xl">
                        <Phone className="w-4 h-4" /> Call Student
                     </a>
                  </div>

                  <div className="bg-black/80 backdrop-blur-md px-6 py-4 rounded-3xl text-white shadow-xl pointer-events-auto">
                     <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest text-center">Distance</p>
                     <p className="font-black text-2xl">{distance !== null ? `${distance} m` : "-- m"}</p>
                  </div>
               </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row gap-4">
              <button
                disabled={activeSOS.status === "reached"}
                onClick={() => updateStatus("reached")}
                className={`flex-1 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
                  activeSOS.status === "reached" 
                  ? "bg-emerald-100 text-emerald-600 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-95"
                }`}
              >
                {activeSOS.status === "reached" ? <CheckCircle2 /> : <MapPin />}
                {activeSOS.status === "reached" ? "YOU HAVE REACHED" : "I HAVE REACHED"}
              </button>

              <button
                onClick={() => updateStatus("resolved")}
                className={`flex-1 py-4 rounded-2xl text-white font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isClose ? "bg-emerald-500 hover:bg-emerald-600 animate-pulse ring-4 ring-emerald-300" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                <CheckCircle2 /> {isClose ? "PROXIMITY: RESOLVE" : "MARK AS RESOLVED"}
              </button>

              <button
                onClick={() => updateStatus("fake")}
                className="flex-1 py-4 rounded-2xl bg-red-100 hover:bg-red-200 text-red-700 font-black shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 border border-red-200"
              >
                <AlertCircle /> MARK AS FAKE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Screen Alert Modal Removed — Moved to Inline View */}

      {/* Floating Audio Toggle when alert is not visible */}
      {!alertSOS && (
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 z-50 hover:scale-110 transition-all"
        >
          {isMuted ? <VolumeX /> : <Volume2 />}
        </button>
      )}
    </div>
  );
}
