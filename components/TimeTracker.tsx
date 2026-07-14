"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Timer } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface TimeTrackerProps {
  onLogTime: (log: {
    description: string;
    project: string;
    startTime: string;
    endTime: string;
    timeZone: string;
    duration?: number;
  }) => void;
  recentTasks?: string[];
}

export default function TimeTracker({ onLogTime, recentTasks = [] }: TimeTrackerProps) {
  const { token, authFetch } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [description, setDescription] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(false);

  const startTimeRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused]);

  // Listen for spacebar to pause/resume when active
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        if (!isActive) return;

        // Ignore spacebar if user is typing or interacting with form inputs/buttons
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.tagName === "BUTTON" ||
            activeElement.tagName === "SELECT" ||
            (activeElement as HTMLElement).isContentEditable)
        ) {
          return;
        }

        // Prevent default spacebar scrolling
        event.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive]);

  // Listen for page unload/tab close to automatically save the active session to the DB
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isActive && startTimeRef.current && token) {
        const endTime = new Date().toISOString();
        const payload = {
          description: description.trim() || "Untitled Task",
          project: "General",
          startTime: startTimeRef.current,
          endTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          duration: seconds,
        };

        // Use keepalive: true to ensure the request completes after browser/tab closes
        authFetch("/api/logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isActive, seconds, description, token]);

  const handleStart = () => {
    if (!description.trim()) {
      setError(true);
      return;
    }
    setError(false);
    setIsActive(true);
    setIsPaused(false);
    startTimeRef.current = new Date().toISOString();
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    if (!startTimeRef.current) return;

    const endTime = new Date().toISOString();
    onLogTime({
      description: description.trim() || "Untitled Task",
      project: "General",
      startTime: startTimeRef.current,
      endTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      duration: seconds,
    });

    // Reset state
    setIsActive(false);
    setIsPaused(false);
    setSeconds(0);
    setDescription("");
    startTimeRef.current = null;
  };

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;

    return [
      hrs.toString().padStart(2, "0"),
      mins.toString().padStart(2, "0"),
      remainingSecs.toString().padStart(2, "0"),
    ].join(":");
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card-bg p-6 shadow-card transition-all duration-300">
      <div className="absolute top-0 right-0 -mr-6 -mt-6 h-24 w-24 rounded-full bg-indigo-500/5 blur-2xl"></div>
      <div className="absolute bottom-0 left-0 -ml-6 -mb-6 h-24 w-24 rounded-full bg-violet-500/5 blur-2xl"></div>

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Form Inputs */}
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between gap-3 min-h-5 flex-wrap">
            <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              What are you working on?
              <span className="text-red-500">*</span>
            </label>
            {recentTasks.length > 0 && !isActive && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center text-[10px] font-medium text-text-secondary/50 uppercase tracking-wider hidden sm:flex shrink-0">
                  Recently used:
                </span>
                {recentTasks.map((task) => (
                  <button
                    key={task}
                    type="button"
                    title={`Reuse: ${task}`}
                    onClick={() => {
                      setDescription(task);
                      setError(false);
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 h-5 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 transition-all duration-200 hover:border-indigo-500/50 hover:bg-indigo-500/20 hover:scale-105 active:scale-95 cursor-pointer max-w-[140px]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
                    <span className="truncate">{task}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (e.target.value.trim()) {
                setError(false);
              }
            }}
            disabled={isActive && !isPaused}
            placeholder="e.g. Designing landing page hero section..."
            className={`mt-2.5 w-full rounded-xl bg-input-bg px-4 py-3 text-sm text-text-primary outline-none transition-all placeholder:text-text-secondary/40 focus:bg-input-bg/70 ${
              error
                ? "border border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/10"
                : "border border-transparent focus:border-indigo-500/50"
            }`}
          />
          {error && (
            <p className="mt-1.5 text-xs text-red-500 font-medium">
              Please describe what you are working on before clocking in.
            </p>
          )}
        </div>

        {/* Stopwatch & Controls */}
        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-4 sm:gap-6 pt-3 sm:pt-6 self-stretch sm:self-center shrink-0">
          <div className="text-center sm:text-right w-full sm:w-auto">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
              Elapsed Time
            </span>
            <div className="font-mono text-3xl font-black tracking-tight text-text-primary flex items-center justify-center sm:justify-end gap-2 leading-none h-9">
              {isActive && !isPaused && (
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              )}
              {formatTime(seconds)}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
            {!isActive ? (
              <button
                type="button"
                onClick={handleStart}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl cursor-pointer bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-button focus:outline-none whitespace-nowrap"
              >
                <Play size={14} fill="white" />
                Clock In
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={isPaused ? handleResume : handlePause}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-button transition-all duration-200 hover:-translate-y-px ${
                    isPaused
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-amber-600 hover:bg-amber-500"
                  }`}
                >
                  {isPaused ? (
                    <Play size={14} fill="white" />
                  ) : (
                    <Pause size={14} fill="white" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-button hover:bg-rose-500 focus:outline-none transition-all duration-200 hover:-translate-y-px"
                >
                  <Square size={12} fill="white" />
                  Clock Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
