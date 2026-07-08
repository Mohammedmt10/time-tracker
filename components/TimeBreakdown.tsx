"use client";

import { PieChart, Clock } from "lucide-react";

interface TimeLog {
  id: string;
  description: string;
  project: string;
  startTime: string;
  endTime: string;
  duration: number;
}

interface TimeBreakdownProps {
  logs: TimeLog[];
  selectedTask: string | null;
  onSelectTask: (task: string | null) => void;
}


export default function TimeBreakdown({
  logs,
  selectedTask,
  onSelectTask,
}: TimeBreakdownProps) {
  const totalSeconds = logs.reduce((acc, log) => acc + log.duration, 0);

  const formatHours = (secs: number) => (secs / 3600).toFixed(1) + "h";

  const taskStats = () => {
    const map: { [key: string]: number } = {};
    logs.forEach((log) => {
      const desc = log.description.trim() || "Untitled Task";
      map[desc] = (map[desc] || 0) + log.duration;
    });
    return Object.entries(map)
      .map(([name, duration]) => ({
        name,
        duration,
        percentage: totalSeconds > 0 ? (duration / totalSeconds) * 100 : 0,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
  };

  const stats = taskStats();

  return (
    <div className="rounded-2xl bg-card-bg p-6 shadow-card flex flex-col h-full">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PieChart className="text-black dark:text-white shrink-0" size={17} />
          <h2 className="text-base font-semibold text-text-primary">Time Investment</h2>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary/50">All time</span>
      </div>

      {/* Empty state */}
      {logs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Clock size={28} className="text-text-secondary/30" />
          <span className="text-xs text-text-secondary">No tracked sessions yet</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {stats.map((item) => {
            const isSelected = selectedTask === item.name;

            return (
              <button
                key={item.name}
                onClick={() => onSelectTask(isSelected ? null : item.name)}
                className={`w-full text-left rounded-xl px-3 py-3 transition-all duration-200 group ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-inset ring-indigo-300/40 dark:ring-indigo-700/40"
                    : "hover:bg-panel-bg/70 dark:hover:bg-panel-bg/40"
                }`}
              >
                {/* Label row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-xs font-semibold truncate leading-tight ${
                      isSelected
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-text-primary group-hover:text-text-primary"
                    }`}
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <div className="flex items-baseline gap-1 shrink-0">
                    <span className={`text-sm font-bold tabular-nums ${isSelected ? "text-indigo-500 dark:text-indigo-400" : "text-text-primary"}`}>
                      {formatHours(item.duration)}
                    </span>
                    <span className="text-[11px] text-text-secondary/60">
                      {Math.round(item.percentage)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-input-bg overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      isSelected ? "bg-indigo-500" : "bg-indigo-500/70"
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}


    </div>
  );
}
