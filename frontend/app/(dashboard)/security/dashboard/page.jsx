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

const SOS_NAMESPACE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/sos`;
const SIREN_URL = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";

export default function SecurityDashboardPage() {
  const { user, setUser } = useAuthStore();
  
  // States
  const [dutyStatus, setDutyStatus] = useState(user?.dutyStatus || "available");
  const [alertSOS, setAlertSOS] = useState(null);
  const [activeSOS, setActiveSOS] = useState(null);
  const [guardLocation, setGuardLocation] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // Refs
  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const watchIdRef = useRef(null);

  // 1. INITIALIZATION: Socket & Audio
  useEffect(() => {
    // Initialize Audio
    audioRef.current = new Audio(SIREN_URL);
    audioRef.current.loop = true;

    // Initialize Socket
    const token = localStorage.getItem("accessToken");
    socketRef.current = io(SOS_NAMESPACE, {
      auth: { token }
    });

    socketRef.current.on("connect", () => {
      console.log("[Security Socket] Connected");
      socketRef.current.emit("join", "security:pool");
    });

    // Listen for new SOS alerts
    socketRef.current.on("sos_alert", (payload) => {
      // Only show alert if guard is available/busy and not already on an SOS
      if (dutyStatus !== "offline" && !activeSOS) {
        setAlertSOS(payload);
        if (!isMuted) audioRef.current.play().catch(e => console.log("Audio play blocked"));
        
        // Browser Notification
        if (Notification.permission === "granted") {
          new Notification("🚨 SOS EMERGENCY", {
            body: `${payload.studentName} needs help!`,
            icon: "/favicon.ico"
          });
        }
      }
    });

    // Listen for location updates
    socketRef.current.on("sos_location_update", (payload) => {
      if (activeSOS && activeSOS.sosId === payload.sosId) {
        setActiveSOS(prev => ({ ...prev, location: { ...prev.location, coordinates: payload.coordinates } }));
      }
    });

    // Listen for cancellation
    socketRef.current.on("sos_cancelled", (payload) => {
      if (alertSOS && alertSOS.sosId === payload.sosId) {
        setAlertSOS(null);
        audioRef.current.pause();
        toast.error("SOS was cancelled by student");
      }
      if (activeSOS && activeSOS.sosId === payload.sosId) {
        setActiveSOS(null);
        setDutyStatus("available");
        toast.error("Active SOS was cancelled by student");
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
  }, [dutyStatus, activeSOS, isMuted, alertSOS]);

  const startGuardTracking = () => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          setGuardLocation(coords);
          // Send to backend via socket
          if (socketRef.current) {
            socketRef.current.emit("security_location_update", { coordinates: coords });
          }
        },
        null,
        { enableHighAccuracy: true }
      );
    }
  };

  // 2. ACTION HANDLERS
  const toggleDuty = async (newStatus) => {
    try {
      const { data } = await api.patch("/api/security/status", { dutyStatus: newStatus });
      setDutyStatus(newStatus);
      // Update store user
      setUser({ ...user, dutyStatus: newStatus });
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
    } catch (err) {
      toast.error("Failed to accept SOS. It might be already assigned.");
      setAlertSOS(null);
      audioRef.current.pause();
    }
  };

  const updateStatus = async (status) => {
    try {
      await api.patch(`/api/sos/${activeSOS.sosId}/status`, { status });
      setActiveSOS(prev => ({ ...prev, status }));
      if (status === "resolved") {
        setDutyStatus("available");
        setActiveSOS(null);
        toast.success("SOS Resolved successfully!");
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
            {guardLocation && (
               <div className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Ready at your current coordinates
               </div>
            )}
          </div>
        ) : (
          /* ACTIVE SOS TRACKING VIEW */
          <div className="flex flex-col h-full">
            <div className="bg-orange-500 p-4 text-white font-black text-center flex items-center justify-center gap-2">
               <Navigation className="w-5 h-5 animate-pulse" /> RESPONDING TO SOS: {activeSOS.studentName}
            </div>
            
            <div className="flex-1 bg-slate-200 relative">
               {/* Map Iframe with Route (Mocking Directions via user/target markers) */}
               <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://maps.google.com/maps?q=${activeSOS.location.coordinates[1]},${activeSOS.location.coordinates[0]}&z=16&output=embed`}
               ></iframe>
               
               <div className="absolute top-6 left-6 right-6 flex items-start justify-between pointer-events-none">
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-white/20 pointer-events-auto">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Information</p>
                     <h3 className="font-black text-lg text-slate-800 dark:text-white">{activeSOS.studentName}</h3>
                     <a href={`tel:${activeSOS.studentPhone}`} className="mt-2 text-blue-600 font-bold flex items-center gap-2 p-2 bg-blue-50 rounded-xl">
                        <Phone className="w-4 h-4" /> Call Student
                     </a>
                  </div>

                  <div className="bg-black/80 backdrop-blur-md px-6 py-4 rounded-3xl text-white shadow-xl pointer-events-auto">
                     <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest text-center">Distance</p>
                     <p className="font-black text-2xl">-- m</p>
                  </div>
               </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4">
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
                className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 /> MARK AS RESOLVED
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- FULL SCREEN ALERT MODAL --- */}
      {alertSOS && (
        <div className="fixed inset-0 z-[200] bg-red-600 p-6 flex items-center justify-center animate-in zoom-in duration-300">
           <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 shadow-[0_0_100px_rgba(255,0,0,0.5)] text-center relative overflow-hidden">
              {/* Animated Background Pulse */}
              <div className="absolute inset-0 bg-red-500/5 animate-pulse" />

              <div className="relative z-10">
                <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <ShieldAlert className="w-12 h-12" />
                </div>

                <h2 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tighter">
                  New SOS Emergency!
                </h2>
                <div className="h-1 w-20 bg-red-600 mx-auto mb-8 rounded-full" />

                <div className="space-y-6 mb-12">
                   <div className="flex items-center justify-center gap-4 text-2xl font-bold text-slate-700 dark:text-slate-200">
                      <User className="text-red-600" /> {alertSOS.studentName}
                   </div>
                   <div className="flex items-center justify-center gap-4 text-xl text-slate-500">
                      <MapPin className="text-red-600" /> Campus Hub Vicinity
                   </div>
                   <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-700 dark:text-red-400 font-bold">
                     Triggered {new Date(alertSOS.timestamp).toLocaleTimeString()}
                   </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                   <button
                    onClick={acceptSOS}
                    className="flex-1 py-6 rounded-[2rem] bg-red-600 hover:bg-red-700 text-white font-black text-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                   >
                     ACCEPT SOS <Navigation className="animate-pulse" />
                   </button>
                   <button
                    onClick={dismissAlert}
                    className="px-8 py-6 rounded-[2rem] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold transition-all"
                   >
                     DISMISS
                   </button>
                </div>
              </div>

              {/* Mute toggle in alert */}
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-8 right-8 p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400"
              >
                {isMuted ? <VolumeX /> : <Volume2 />}
              </button>
           </div>
        </div>
      )}

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
