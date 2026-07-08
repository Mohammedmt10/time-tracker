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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load token and verify user on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem("worktime_auth_token");
        if (!storedToken) {
          setLoading(false);
          return;
        }

        setToken(storedToken);

        // Verify token by calling /api/auth/me
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token is invalid/expired
          localStorage.removeItem("worktime_auth_token");
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        // Auth initialization failed
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      localStorage.setItem("worktime_auth_token", data.token);
      setToken(data.token);
      setUser(data.user);
      router.push("/");
      return { success: true };
    } catch (err) {
      return { success: false, error: "An unexpected error occurred. Please try again." };
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      localStorage.setItem("worktime_auth_token", data.token);
      setToken(data.token);
      setUser(data.user);
      router.push("/");
      return { success: true };
    } catch (err) {
      return { success: false, error: "An unexpected error occurred. Please try again." };
    }
  };

  const logout = () => {
    localStorage.removeItem("worktime_auth_token");
    setToken(null);
    setUser(null);
    router.push("/login");
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
