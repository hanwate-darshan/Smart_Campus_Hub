"use client";

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function CreateUserModal({ isOpen, onClose, role }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: role || "teacher",
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(`${API_BASE}/api/admin/create-user`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`${formData.role === "teacher" ? "Teacher" : "Security"} account created!`);
      setFormData({ name: "", email: "", password: "", phone: "", role: role || "teacher" });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            Create {formData.role === "teacher" ? "Teacher" : "Security"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!role && (
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select name="role" value={formData.role} onChange={handleChange} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="teacher">Teacher</option>
                <option value="security">Security</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Full Name</label>
            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white" placeholder="John Doe" />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Email Address</label>
            <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white" placeholder="john@university.edu" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Phone (Optional)</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white" placeholder="10 digit number" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Initial Password</label>
            <input required type="password" minLength={8} name="password" value={formData.password} onChange={handleChange} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white" placeholder="Minimum 8 characters" />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 transition flex items-center gap-2">
              {loading && <div className="h-4 w-4 border-2 border-white rounded-full border-t-transparent animate-spin"/>}
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
