"use client";

import { Clock, Calendar, Award } from "lucide-react";

interface TimeLog {
  id: string;
  description: string;
  project: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
}

interface StatsPanelProps {
  logs: TimeLog[];
}

export default function StatsPanel({ logs }: StatsPanelProps) {
  // Helper to format hours
  const formatHours = (seconds: number) => {
    const hrs = seconds / 3600;
    return hrs.toFixed(1);
  };

  // Get current date boundaries
  const now = new Date();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Start of this week (Monday)
  const startOfWeek = new Date();
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  // Start of this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Filter logs
  const todayLogs = logs.filter(
    (log) => new Date(log.startTime) >= startOfToday,
  );
  const weekLogs = logs.filter((log) => new Date(log.startTime) >= startOfWeek);
  const monthLogs = logs.filter(
    (log) => new Date(log.startTime) >= startOfMonth,
  );

  // Sum durations
  const todaySeconds = todayLogs.reduce((acc, log) => acc + log.duration, 0);
  const weekSeconds = weekLogs.reduce((acc, log) => acc + log.duration, 0);
  const monthSeconds = monthLogs.reduce((acc, log) => acc + log.duration, 0);

  // Progress relative to daily 8-hour goal
  const dailyGoalHours = 8;
  const todayHours = todaySeconds / 3600;
  const todayProgress = Math.min((todayHours / dailyGoalHours) * 100, 100);

  const stats = [
    {
      name: "Hours Today",
      value: `${formatHours(todaySeconds)}h`,
      subtext: `Goal: ${dailyGoalHours}h`,
      icon: Clock,
      color: "text-text-primary",
      bgColor: "bg-input-bg",
      progress: todayProgress,
    },
    {
      name: "Hours This Week",
      value: `${formatHours(weekSeconds)}h`,
      subtext: "Mon - Sun active time",
      icon: Calendar,
      color: "text-text-primary",
      bgColor: "bg-input-bg",
    },
    {
      name: "Monthly Total",
      value: `${formatHours(monthSeconds)}h`,
      subtext: `Total for ${now.toLocaleString("en-US", { month: "long" })}`,
      icon: Award,
      color: "text-text-primary",
      bgColor: "bg-input-bg",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={stat.name}
            className="group relative overflow-hidden rounded-2xl bg-card-bg p-5 shadow-card transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  {stat.name}
                </span>
                <div className="text-2xl font-semibold tracking-tight text-text-primary">
                  {stat.value}
                </div>
                <div className="text-xs font-medium text-text-secondary truncate max-w-[180px]">
                  {stat.subtext}
                </div>
              </div>
              <div
                className={`rounded-xl p-2.5 ${stat.bgColor} ${stat.color} transition-transform duration-300 group-hover:scale-105`}
              >
                <IconComponent size={20} />
              </div>
            </div>

            {/* Render a progress bar for the Daily Goal */}
            {"progress" in stat && (
              <div className="mt-4 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary">
                  <span>Daily Progress</span>
                  <span>{Math.round(stat.progress || 0)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-input-bg">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500 ease-out"
                    style={{ width: `${stat.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
