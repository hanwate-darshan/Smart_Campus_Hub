"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedIdProof, setSelectedIdProof] = useState(null);
  const [rejectionModalUser, setRejectionModalUser] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPendingUsers = async () => {
    try {
      const { data } = await api.get(`/api/admin/pending-users`);
      if (data.success) {
        setPendingUsers(data.data);
      }
    } catch (err) {
      toast.error("Failed to fetch pending users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();

    const socket = io(`${API_BASE}/notifications`);
    socket.emit("join_admin");

    socket.on("notification_push", (data) => {
      if (data.type === "new_registration") {
        fetchPendingUsers();
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white dark:bg-slate-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black/5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">New Registration!</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{data.message}</p>
                </div>
              </div>
            </div>
          </div>
        ));
      }
    });

    return () => socket.disconnect();
  }, []);

  const handleApprove = async (id) => {
    setActionLoadingId(id);
    try {
      await api.patch(`/api/admin/users/${id}/approve`);
      toast.success("Student approved successfully");
      setPendingUsers((prev) => prev.filter((user) => user._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || "Approval failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    const id = rejectionModalUser._id;
    setActionLoadingId(id);
    try {
      await api.patch(`/api/admin/users/${id}/reject`, { reason: rejectReason });
      toast.success("Student rejected");
      setPendingUsers((prev) => prev.filter((user) => user._id !== id));
      setRejectionModalUser(null);
      setRejectReason("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Rejection failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            Pending Student Approvals
            {pendingUsers.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-sm font-semibold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {pendingUsers.length} waiting
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Review and approve new student registrations.</p>
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center animate-in fade-in duration-500">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">All Caught Up!</h3>
          <p className="text-slate-500">No pending registrations at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingUsers.map((user) => (
            <div key={user._id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col group transition hover:-translate-y-1 hover:shadow-md">
              <div className="p-5 flex-1 relative">
                {/* ID Proof Thumbnail */}
                <div 
                  className="w-full h-40 bg-slate-100 dark:bg-slate-900 rounded-lg mb-4 cursor-pointer overflow-hidden relative group/img"
                  onClick={() => setSelectedIdProof(user.idProofUrl)}
                >
                  {user.idProofUrl ? (
                    <img src={user.idProofUrl} alt="ID Proof" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">No ID Provided</div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Click to View</span>
                  </div>
                </div>

                <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">{user.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{user.email}</p>
                
                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <p><span className="font-medium">Phone:</span> {user.phone || 'N/A'}</p>
                  <p><span className="font-medium">Registered:</span> {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-700 border-t border-slate-100 dark:border-slate-700">
                <button
                  disabled={actionLoadingId === user._id}
                  onClick={() => handleApprove(user._id)}
                  className="py-3 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {actionLoadingId === user._id ? <div className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"/> : "Approve"}
                </button>
                <button
                  disabled={actionLoadingId === user._id}
                  onClick={() => setRejectionModalUser(user)}
                  className="py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ID Proof Modal */}
      {selectedIdProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedIdProof(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex justify-center mt-6">
            <button className="absolute -top-12 right-0 text-white hover:text-slate-300">
              Close (✕)
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedIdProof} alt="Full ID Proof" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Reject Registration</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Are you sure you want to reject <span className="font-semibold text-slate-700 dark:text-slate-300">{rejectionModalUser.name}</span>?
              </p>
              
              <form onSubmit={handleReject}>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Reason (Optional)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm mb-4 min-h-[80px]"
                  placeholder="e.g. ID proof is blurry"
                />
                
                <div className="flex justify-end gap-3 w-full">
                  <button type="button" onClick={() => setRejectionModalUser(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700">
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoadingId !== null} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-70 flex items-center gap-2">
                    {actionLoadingId !== null && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                    Confirm Reject
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
