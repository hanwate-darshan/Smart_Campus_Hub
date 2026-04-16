"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/auth.store";

const redirectMap = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
  security: "/security/dashboard",
};

export default function RoleGuard({ allowedRoles, children }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Wait until store initialization completes
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace("/");
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace(redirectMap[user.role] || "/");
    }
  }, [isAuthenticated, isLoading, user, router, allowedRoles]);

  // Show spinner while store is initializing (checking token validity)
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="spinner h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not authenticated or wrong role — show nothing while redirect happens
  if (!isAuthenticated || !user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="spinner h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}

// Usage example:
// <RoleGuard allowedRoles={["student"]}>
//   <StudentPage />
// </RoleGuard>
