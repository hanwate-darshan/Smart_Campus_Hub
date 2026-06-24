"use client";
import { useState } from 'react';

import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email });
      toast.success(data.message || 'Reset email sent');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send reset email';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen" style={{ background: '#131314' }}>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-sm mx-auto flex items-center justify-center px-6 py-12"
      >
        <div className="w-full space-y-6">
          <h2 className="text-2xl font-bold text-white text-center">Forgot Password</h2>
          <p className="text-sm text-white/60 text-center">
            Enter your email address and we\'ll send you a link to reset your password.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#1e1f20] border border-[#3c4043] text-[#e8eaed] placeholder:text-[#5f6368] focus:outline-none focus:border-[#8ab4f8]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#8ab4f8] text-[#131314] font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <div className="text-center">
            <Link href="/login" className="text-sm text-[#8ab4f8] hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
