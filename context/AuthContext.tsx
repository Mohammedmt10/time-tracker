"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, recaptchaToken?: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, recaptchaToken?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load token and verify user on mount using the refresh token cookie
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
        });

        if (res.ok) {
          const data = await res.json();
          setToken(data.token);
          setUser(data.user);
        } else {
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        // Initialization failed
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Setup silent refresh interval (every 14 minutes) to fetch new access token
  useEffect(() => {
    if (!token) return;

    const refreshInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setToken(data.token);
          setUser(data.user);
        } else {
          logout();
        }
      } catch (err) {
        // Ignore failure and retry on next interval (or let 401 handling take care of it)
      }
    }, 14 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [token]);

  const login = async (email: string, password: string, recaptchaToken?: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, recaptchaToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      setToken(data.token);
      setUser(data.user);
      router.push("/");
      return { success: true };
    } catch (err) {
      return { success: false, error: "An unexpected error occurred. Please try again." };
    }
  };

  const register = async (email: string, password: string, recaptchaToken?: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, recaptchaToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      setToken(data.token);
      setUser(data.user);
      router.push("/");
      return { success: true };
    } catch (err) {
      return { success: false, error: "An unexpected error occurred. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      // Ignore network error on logout
    }
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  // Auth fetch wrapper that handles authorization header and automatic token refreshing on 401
  const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    let currentToken = token;

    if (currentToken) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }

    const fetchOptions: RequestInit = {
      ...init,
      headers,
    };

    let res = await fetch(input, fetchOptions);

    if (res.status === 401 && currentToken) {
      try {
        const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newToken = refreshData.token;
          
          setToken(newToken);
          setUser(refreshData.user);

          headers.set("Authorization", `Bearer ${newToken}`);
          res = await fetch(input, { ...init, headers });
        } else {
          logout();
        }
      } catch (err) {
        logout();
      }
    }

    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
