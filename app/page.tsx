"use client";

import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { Sun, Moon, Clock, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import TimeTracker from "@/components/TimeTracker";
import StatsPanel from "@/components/StatsPanel";
import AnalyticsChart from "@/components/AnalyticsChart";
import LogHistory from "@/components/LogHistory";
import TimeBreakdown from "@/components/TimeBreakdown";

interface TimeLog {
  id: string;
  description: string;
  project: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
}

const playThemeToggleSound = (isDark: boolean) => {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Triangle wave creates a hollow, woody timbre
    osc.type = "triangle";

    if (isDark) {
      // Lower hollow wood knock (600Hz -> 300Hz in 30ms)
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    } else {
      // Higher hollow wood knock (800Hz -> 400Hz in 30ms)
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch (e) {
    // Sound failed
  }
};

export default function Home() {
  const { user, token, isAuthenticated, loading, logout, authFetch } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Sync isDarkMode React state from document element classes on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  // Route protection redirect trigger
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  // Load user logs from DB endpoint
  useEffect(() => {
    if (!token) return;

    const fetchLogs = async () => {
      try {
        const res = await authFetch("/api/logs");
        if (res.ok) {
          const data = await res.json();
          const mappedLogs = data.logs.map((log: any) => ({
            id: log.id,
            description: log.description,
            project: log.project,
            startTime: log.startTime,
            endTime: log.endTime,
            duration: log.duration,
          }));
          setLogs(mappedLogs);
        }
      } catch (err) {
        // Fetch failed
      }
    };

    fetchLogs();
  }, [token]);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    const doc = document as any;

    // Play synthetic woodblock tap click sound
    playThemeToggleSound(nextDark);

    if (!doc.startViewTransition) {
      // Fallback for browsers that don't support View Transitions
      setIsDarkMode(nextDark);
      document.documentElement.classList.toggle("dark", nextDark);
      localStorage.setItem("worktime_theme", nextDark ? "dark" : "light");
      return;
    }

    // Start transition and use flushSync to force React to paint the light/dark state synchronously
    doc.startViewTransition(() => {
      flushSync(() => {
        setIsDarkMode(nextDark);
        document.documentElement.classList.toggle("dark", nextDark);
        localStorage.setItem("worktime_theme", nextDark ? "dark" : "light");
      });
    });
  };

  const handleLogTime = async (newLogData: Omit<TimeLog, "id"> & { timeZone: string }) => {
    if (!token) return;
    try {
      const res = await authFetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newLogData),
      });

      if (res.ok) {
        const data = await res.json();
        const newLogs: TimeLog[] = data.logs
          .map((log: TimeLog) => ({
            id: log.id,
            description: log.description,
            project: log.project,
            startTime: log.startTime,
            endTime: log.endTime,
            duration: log.duration,
          }))
          .sort(
            (a: TimeLog, b: TimeLog) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
        setLogs((prev) => {
          const newIds = new Set(newLogs.map((log) => log.id));
          return [...newLogs, ...prev.filter((log) => !newIds.has(log.id))];
        });
      }
    } catch (err) {
      // Save failed
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!token) return;
    if (confirm("Are you sure you want to delete this log entry?")) {
      try {
        const res = await authFetch(`/api/logs/${id}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setLogs((prev) => prev.filter((log) => log.id !== id));
        }
      } catch (err) {
        // Delete failed
      }
    }
  };

  const handleUpdateLog = async (id: string, description: string) => {
    if (!token) return;
    try {
      const res = await authFetch(`/api/logs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description }),
      });

      if (res.ok) {
        setLogs((prev) =>
          prev.map((log) => {
            if (log.id === id) {
              return { ...log, description };
            }
            return log;
          })
        );
      }
    } catch (err) {
      // Update failed
    }
  };

  // Render a clean loading indicator while routing or verifying JWT
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-text-primary">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute h-8 w-8 border-4 border-purple-500/20 border-b-purple-500 rounded-full animate-spin [animation-direction:reverse]"></div>
        </div>
        <p className="mt-4 text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase animate-pulse">
          Securing Session...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-text-primary transition-colors duration-300">
      {/* Top Header */}
      <header className="relative z-10 bg-transparent">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500/10 text-white dark:text-indigo-400 border border-transparent dark:border-indigo-500/20 shadow-md shadow-indigo-600/20 dark:shadow-none transition-all duration-300">
              <Clock size={18} />
            </div>
            <div>
              <span className="block text-base font-extrabold tracking-tight text-text-primary leading-tight font-title">
                WorkTime
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Premium Analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* GitHub Link */}
            <a
              href="https://github.com/Mohammedmt10/time-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-transparent text-text-secondary hover:text-text-primary transition-colors duration-200"
              title="GitHub Repository"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-github">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </a>

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-transparent text-text-secondary hover:text-text-primary transition-colors duration-200"
              title="Toggle theme"
            >
              {isDarkMode ? (
                <Sun size={18} className="text-white" />
              ) : (
                <Moon size={18} />
              )}
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-text-secondary/15"></div>

            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-sm shadow-indigo-500/10">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : "U"}
              </div>
              <div className="hidden sm:block text-left">
                <span className="block text-xs font-bold text-text-primary leading-none">
                  {user?.name || user?.email.split("@")[0]}
                </span>
                <span className="block text-[10px] text-text-secondary">
                  {user?.email}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-transparent border border-text-secondary/15 hover:border-red-500/30 hover:bg-red-500/5 text-text-secondary hover:text-red-500 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer"
            >
              <LogOut size={13} className="shrink-0" />
              <span className="hidden xs:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 space-y-6 sm:px-6 lg:px-8">
        {/* Intro Hero banner */}
        <div className="relative overflow-hidden rounded-2xl bg-card-bg p-6 shadow-card">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl"></div>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-normal tracking-tight text-text-primary sm:text-3xl">
                {user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome back to your workspace"}
              </h1>
              <p className="text-sm font-light text-text-secondary/80">
                Track your active tasks in real-time, view metrics, and maintain
                a seamless record of your daily accomplishments.
              </p>
            </div>

            {/* Quick overview of total joined stats */}
            {logs.length > 0 && (
              <div className="flex items-center gap-3 pt-3 sm:pt-0 self-end sm:self-auto shrink-0">
                <div className="text-right">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                    Total Time Logged
                  </span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {Math.round(
                      logs.reduce((acc, log) => acc + log.duration, 0) / 3600,
                    )}{" "}
                    hrs
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tracking timer section */}
        <TimeTracker
          onLogTime={handleLogTime}
          recentTasks={
            logs
              .reduce<string[]>((acc, log) => {
                if (!acc.includes(log.description)) acc.push(log.description);
                return acc;
              }, [])
              .slice(0, 3)
          }
        />

        {/* Key Indicators section */}
        <StatsPanel logs={logs} />

        {/* Analytics Chart & Breakdown summary */}
        <div className="grid gap-6 lg:grid-cols-3 items-stretch">
          {/* SVG Chart Column */}
          <div className="lg:col-span-2">
            <AnalyticsChart logs={logs} selectedTask={selectedTask} />
          </div>

          {/* Breakdown summary Column */}
          <div className="lg:col-span-1">
            <TimeBreakdown
              logs={logs}
              selectedTask={selectedTask}
              onSelectTask={setSelectedTask}
            />
          </div>
        </div>

        {/* Table history logs */}
        <div className="w-full">
          <LogHistory
            logs={logs}
            onDeleteLog={handleDeleteLog}
            onUpdateLog={handleUpdateLog}
          />
        </div>
      </main>
    </div>
  );
}
