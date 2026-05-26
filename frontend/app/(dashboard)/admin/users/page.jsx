"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { Plus, Loader2, X, AlertTriangle, UserPlus, Mail, Lock, Phone, ShieldCheck, Trash2, Ban, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "teacher",
    phone: "",
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const { data } = await axios.get(`${API_BASE}/api/admin/users?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(`${API_BASE}/api/admin/create-user`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`${form.role} created successfully!`);
      setShowModal(false);
      setForm({ name: "", email: "", password: "", role: "teacher", phone: "" });
      fetchUsers(); // Refresh the list
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAction = async (action, userId) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (action === 'delete') {
        if (!confirm("Are you sure you want to delete this user?")) return;
        await axios.delete(`${API_BASE}/api/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("User deleted successfully");
      } else if (action === 'block') {
        if (!confirm("Are you sure you want to block this user?")) return;
        await axios.patch(`${API_BASE}/api/admin/users/${userId}/suspend`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("User blocked successfully");
      } else if (action === 'unblock') {
        if (!confirm("Are you sure you want to unblock this user?")) return;
        await axios.patch(`${API_BASE}/api/admin/users/${userId}/unblock`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("User unblocked successfully");
      }
      fetchUsers();
    } catch (err) {
      toast.error(`Failed to ${action} user`);
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      case 'teacher': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'security': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const tabs = [
    { id: 'all', label: 'All Users' },
    { id: 'student', label: 'Students' },
    { id: 'teacher', label: 'Teachers' },
    { id: 'security', label: 'Security' },
    { id: 'admin', label: 'Admins' }
  ];

  const filteredUsers = activeTab === 'all' ? users : users.filter(user => user.role === activeTab);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            User Management
            <span className="px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {users.length} Total
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage all registered users and add new staff.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Staff
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 hide-scrollbar mb-2">
        <div className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {tab.label}
              <span className={`text-xs py-0.5 px-2 rounded-full ${
                activeTab === tab.id 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {tab.id === 'all' ? users.length : users.filter(u => u.role === tab.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold hidden md:table-cell">Joined</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{user.name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${
                        user.status === 'approved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        user.status === 'suspended' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-sm text-slate-500 dark:text-slate-400">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === 'suspended' ? (
                          <button
                            onClick={() => handleAction('unblock', user._id)}
                            className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                            title="Unblock User"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('block', user._id)}
                            className="p-2 rounded-xl text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
                            title="Block User"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleAction('delete', user._id)}
                          className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">
                      No {activeTab === 'all' ? 'users' : activeTab + 's'} found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1f20] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-[#3c4043]"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#3c4043]">
                <h3 className="text-lg font-bold text-slate-800 dark:text-[#e8eaed] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                  Add New Staff
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#282a2c] transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-[#9aa0a6] uppercase tracking-wider">Role</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><ShieldCheck className="w-4 h-4" /></div>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131314] border border-slate-200 dark:border-[#3c4043] text-sm text-slate-800 dark:text-[#e8eaed] focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="teacher">Teacher</option>
                      <option value="security">Security</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-[#9aa0a6] uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><UserPlus className="w-4 h-4" /></div>
                    <input required name="name" type="text" value={form.name} onChange={handleChange} placeholder="Staff Name"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131314] border border-slate-200 dark:border-[#3c4043] text-sm text-slate-800 dark:text-[#e8eaed] focus:outline-none focus:border-blue-500 transition" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-[#9aa0a6] uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Mail className="w-4 h-4" /></div>
                    <input required name="email" type="email" value={form.email} onChange={handleChange} placeholder="staff@college.edu"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131314] border border-slate-200 dark:border-[#3c4043] text-sm text-slate-800 dark:text-[#e8eaed] focus:outline-none focus:border-blue-500 transition" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-[#9aa0a6] uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="w-4 h-4" /></div>
                    <input required name="password" type="text" value={form.password} onChange={handleChange} placeholder="Min 8 characters" minLength={8}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131314] border border-slate-200 dark:border-[#3c4043] text-sm text-slate-800 dark:text-[#e8eaed] focus:outline-none focus:border-blue-500 transition" />
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3"/> Make sure to securely share this password with the staff.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-[#9aa0a6] uppercase tracking-wider">Phone (Optional)</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Phone className="w-4 h-4" /></div>
                    <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="10-digit number"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131314] border border-slate-200 dark:border-[#3c4043] text-sm text-slate-800 dark:text-[#e8eaed] focus:outline-none focus:border-blue-500 transition" />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 dark:bg-[#282a2c] dark:text-[#e8eaed] hover:bg-slate-200 dark:hover:bg-[#3c4043] transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={createLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2 transition">
                    {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Staff"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
