"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Loader2, ShieldAlert, CheckCircle2, Clock, MapPin } from "lucide-react";

export default function SecurityHistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, we would fetch from /api/sos/history
    // For now, we'll just mock it or show empty state if no endpoint exists yet
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <Clock className="w-6 h-6 text-slate-500" /> SOS History
      </h1>

      {history.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <ShieldAlert className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700 dark:text-white mb-2">No History Found</h3>
          <p className="text-slate-500">There are no past SOS alerts assigned to you.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((sos, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-white">SOS #{sos._id}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" /> Campus Location
                </p>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-medium text-sm">
                <CheckCircle2 className="w-4 h-4" /> Resolved
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
