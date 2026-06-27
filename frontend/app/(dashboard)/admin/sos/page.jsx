"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function AdminSOSPage() {
  const [sosList, setSosList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSOSHistory();
  }, []);

  const fetchSOSHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/sos/all");
      if (res.data.success) {
        setSosList(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to fetch SOS history");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, isFake) => {
    if (isFake) return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/20">Fake Alert</span>;
    switch (status) {
      case "active":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/20 animate-pulse">Active</span>;
      case "assigned":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/20">Security Dispatched</span>;
      case "reached":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/20">Security Arrived</span>;
      case "resolved":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/20">Resolved</span>;
      case "cancelled":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/20">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/20">{status}</span>;
    }
  };

  const stats = {
    total: sosList.length,
    active: sosList.filter(s => s.status === 'active' || s.status === 'assigned' || s.status === 'reached').length,
    resolved: sosList.filter(s => s.status === 'resolved' && !s.isFake).length,
    fake: sosList.filter(s => s.isFake).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8ab4f8]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#e8eaed]">SOS Analytics</h1>
          <p className="text-sm text-[#9aa0a6] mt-1">Monitor all emergency alerts across the campus</p>
        </div>
        <button 
          onClick={fetchSOSHistory}
          className="flex items-center gap-2 px-4 py-2 bg-[#282a2c] hover:bg-[#3c4043] text-[#e8eaed] rounded-lg transition-colors border border-[#3c4043]"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1e1f20] border border-[#3c4043] rounded-xl p-5">
          <p className="text-sm font-medium text-[#9aa0a6]">Total Alerts</p>
          <p className="text-3xl font-bold text-[#e8eaed] mt-2">{stats.total}</p>
        </div>
        <div className="bg-[#1e1f20] border border-[#red-500/30] rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <p className="text-sm font-medium text-red-400">Active Emergencies</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{stats.active}</p>
        </div>
        <div className="bg-[#1e1f20] border border-[#green-500/30] rounded-xl p-5">
          <p className="text-sm font-medium text-green-400">Resolved</p>
          <p className="text-3xl font-bold text-green-400 mt-2">{stats.resolved}</p>
        </div>
        <div className="bg-[#1e1f20] border border-[#orange-500/30] rounded-xl p-5">
          <p className="text-sm font-medium text-orange-400">Fake/Misuse</p>
          <p className="text-3xl font-bold text-orange-400 mt-2">{stats.fake}</p>
        </div>
      </div>

      <div className="bg-[#1e1f20] border border-[#3c4043] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#3c4043]">
          <h2 className="text-lg font-medium text-[#e8eaed]">Emergency History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#3c4043] bg-[#282a2c]/50">
                <th className="px-6 py-3 text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider">Date/Time</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider">Emergency Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider">Security Guard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c4043]">
              {sosList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-[#9aa0a6]">
                    No SOS history found.
                  </td>
                </tr>
              ) : (
                sosList.map((sos) => (
                  <tr key={sos._id} className="hover:bg-[#282a2c]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#e8eaed]">
                      {new Date(sos.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#e8eaed]">
                      <div className="font-medium">{sos.studentId?.name || "Unknown"}</div>
                      <div className="text-xs text-[#9aa0a6]">{sos.studentId?.phone || "No Phone"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#e8eaed] capitalize">
                      {sos.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#9aa0a6] max-w-xs truncate" title={sos.locationDetails}>
                      {sos.locationDetails}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(sos.status, sos.isFake)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#e8eaed]">
                      {sos.assignedSecurityId ? (
                        <div>
                          <div className="font-medium">{sos.assignedSecurityId.name}</div>
                          <div className="text-xs text-[#9aa0a6]">{sos.assignedSecurityId.phone}</div>
                        </div>
                      ) : (
                        <span className="text-[#9aa0a6] italic">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
