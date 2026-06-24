"use client";
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { Suspense } from 'react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid reset token');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/reset-password', { token, newPassword });
      toast.success(data.message || 'Password reset successful');
      router.push('/auth/login');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to reset password';
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
          <h2 className="text-2xl font-bold text-white text-center">Reset Password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                required
                className="w-full pl-10 pr-12 py-3 rounded-xl bg-[#1e1f20] border border-[#3c4043] text-[#e8eaed] placeholder:text-[#5f6368] focus:outline-none focus:border-[#8ab4f8]"
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#5f6368] hover:text-[#9aa0a6] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </motion.button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#8ab4f8] text-[#131314] font-semibold disabled:opacity-60"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
          <div className="text-center mt-4">
            <Link href="/login" className="text-sm text-[#8ab4f8] hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="flex items-center justify-center min-h-screen" style={{ background: '#131314' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#8ab4f8' }} />
      </main>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
