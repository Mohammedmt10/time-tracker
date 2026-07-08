"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, ArrowRight, Clock, Sparkles } from "lucide-react";

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, the context handles redirects. But let's verify.
  useEffect(() => {
    document.title = "Sign In — WorkTime";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await login(email, password);

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || "Invalid email or password.");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden transition-colors duration-300">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-600/10 dark:bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-purple-600/10 dark:bg-purple-500/5 blur-[140px] pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 dark:bg-indigo-500/10 text-white dark:text-indigo-400 border border-transparent dark:border-indigo-500/20 shadow-lg shadow-indigo-600/20 dark:shadow-none mb-3 ">
            <Clock size={24} />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-text-primary leading-tight font-title">
            WorkTime
          </h2>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mt-1">
            Premium Work Tracker
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card-bg border border-card-border shadow-card rounded-2xl p-8 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 h-20 w-20 rounded-full bg-indigo-500/5 blur-xl"></div>

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              Welcome Back
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Sign in to manage your logs and track analytics
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium leading-relaxed transition-all animate-shake">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-secondary pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-input-bg border border-transparent rounded-xl text-sm text-text-primary placeholder-text-secondary/50 focus:bg-card-bg focus:border-indigo-500/50 outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-secondary pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-input-bg border border-transparent rounded-xl text-sm text-text-primary placeholder-text-secondary/50 focus:bg-card-bg focus:border-indigo-500/50 outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-semibold rounded-xl text-sm shadow-button transition-all duration-200 disabled:opacity-75 disabled:pointer-events-none group"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In
                  <ArrowRight
                    size={16}
                    className="transform group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          {/* Card Footer Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-text-secondary/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card-bg px-3 text-text-secondary/60">
                New to tracker?
              </span>
            </div>
          </div>

          {/* Registration Link */}
          <Link
            href="/register"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-transparent border border-text-secondary/15 hover:border-text-secondary/35 text-text-primary font-semibold rounded-xl text-sm transition-all duration-200 active:scale-[0.98]"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
