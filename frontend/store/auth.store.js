import { create } from "zustand";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Decode JWT payload without a library (works in browser)
const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  // expired if less than 5 seconds remaining
  return decoded.exp * 1000 < Date.now() + 5000;
};

const useAuthStore = create((set, get) => ({
  // State
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // true until initialization completes

  // Actions
  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));

    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  clearAuth: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateUser: (updatedData) => {
    const currentUser = get().user;
    const mergedUser = { ...currentUser, ...updatedData };

    localStorage.setItem("user", JSON.stringify(mergedUser));

    set({ user: mergedUser });
  },

  // Initialize auth state from localStorage on app load
  initializeAuth: async () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }

    try {
      const storedAccessToken = localStorage.getItem("accessToken");
      const storedRefreshToken = localStorage.getItem("refreshToken");
      const storedUser = localStorage.getItem("user");

      // Nothing stored — not authenticated
      if (!storedUser || (!storedAccessToken && !storedRefreshToken)) {
        set({ isLoading: false });
        return;
      }

      const user = JSON.parse(storedUser);

      // Case 1: Access token exists and is still valid
      if (storedAccessToken && !isTokenExpired(storedAccessToken)) {
        set({
          user,
          accessToken: storedAccessToken,
          refreshToken: storedRefreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      // Case 2: Access token expired but refresh token exists — try to refresh
      if (storedRefreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, {
            refreshToken: storedRefreshToken,
          });

          const newAccessToken = data.data.accessToken;
          localStorage.setItem("accessToken", newAccessToken);

          set({
            user,
            accessToken: newAccessToken,
            refreshToken: storedRefreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        } catch {
          // Refresh failed — tokens are invalid, clear everything
        }
      }

      // Fallthrough — clear auth
      get().clearAuth();
    } catch {
      get().clearAuth();
    }
  },
}));

// Auto-initialize on store creation (client-side only)
if (typeof window !== "undefined") {
  useAuthStore.getState().initializeAuth();
}

export default useAuthStore;
