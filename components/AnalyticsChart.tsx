"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";

interface TimeLog {
  id: string;
  description: string;
  project: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
}

interface AnalyticsChartProps {
  logs: TimeLog[];
  selectedTask?: string | null;
}

export default function AnalyticsChart({
  logs,
  selectedTask,
}: AnalyticsChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // If a task is selected, filter logs to only that task's entries
  const activeLogs = selectedTask
    ? logs.filter((l) => l.description.trim() === selectedTask)
    : logs;

  // Get the last 7 days starting from today backwards (aligned to UTC midnight)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Create a Date representing midnight UTC of this day
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
  }).reverse();

  // Aggregate hours for each of the last 7 days
  const chartData = last7Days.map((date) => {
    const dayName = date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    const dayLabel = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

    const dayStart = date.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const dayLogs = activeLogs.filter((log) => {
      const logTime = new Date(log.startTime).getTime();
      return logTime >= dayStart && logTime < dayEnd;
    });

    const totalSeconds = dayLogs.reduce((acc, log) => acc + log.duration, 0);

    const hours = Number((totalSeconds / 3600).toFixed(2));

    return {
      dayName,
      dayLabel,
      hours,
    };
  });

  // Calculate the max hours to scale the chart dynamically
  const maxHours = Math.max(...chartData.map((d) => d.hours), 8); // At least scale to 8 hours
  const scaleMax = Math.ceil(maxHours + 1);

  // SVG dimensions
  const width = 600;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  return (
    <div className="rounded-2xl bg-card-bg p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-black dark:text-white" size={18} />
          <h2 className="text-lg font-semibold text-text-primary">
            {selectedTask ? (
              <>
                <span className="text-text-secondary font-normal text-sm">
                  Showing:{" "}
                </span>
                <span
                  className="truncate max-w-[420px] inline-block align-bottom"
                  title={selectedTask}
                >
                  {selectedTask}
                </span>
              </>
            ) : (
              "Last 7 Days Activity"
            )}
          </h2>
        </div>
        <span className="text-xs text-text-secondary">
          {selectedTask ? "hours / day for this task" : "Hours worked / day"}
        </span>
      </div>

      <div className="relative w-full overflow-hidden">
        {/* SVG Container */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const value = (scaleMax * ratio).toFixed(1);
            return (
              <g key={i} className="opacity-60">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  className="text-panel-bg"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="font-mono text-[10px] font-semibold fill-zinc-400 dark:fill-zinc-500"
                >
                  {value}h
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {chartData.map((data, index) => {
            const barWidth = 36;
            const gap =
              (chartWidth - barWidth * chartData.length) /
              (chartData.length - 1);
            const x = paddingLeft + index * (barWidth + gap);
            const barHeight = (data.hours / scaleMax) * chartHeight;
            const y = paddingTop + chartHeight - barHeight;
            const isHovered = hoveredIndex === index;

            return (
              <g
                key={index}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Background column trigger area */}
                <rect
                  x={x - gap / 2}
                  y={paddingTop}
                  width={barWidth + gap}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Actual Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 4)} // at least render a sliver for 0h
                  rx={6}
                  fill={isHovered ? "#4338ca" : "#4f46e5"}
                  className="transition-all duration-300 ease-out"
                />

                {/* X Axis Label */}
                <text
                  x={x + barWidth / 2}
                  y={height - paddingBottom + 18}
                  textAnchor="middle"
                  className="text-[11px] font-bold fill-zinc-500 dark:fill-zinc-400"
                >
                  {data.dayName}
                </text>

                <text
                  x={x + barWidth / 2}
                  y={height - paddingBottom + 30}
                  textAnchor="middle"
                  className="text-[9px] font-medium fill-zinc-400 dark:fill-zinc-500"
                >
                  {data.dayLabel}
                </text>

                {/* Tooltip on top of the bar */}
                {isHovered && (
                  <g className="animate-fade-in">
                    <rect
                      x={x - 16}
                      y={y - 28}
                      width={barWidth + 32}
                      height={20}
                      rx={4}
                      className="fill-zinc-800 dark:fill-zinc-100 shadow-md"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 15}
                      textAnchor="middle"
                      className="font-mono text-[10px] font-bold fill-white dark:fill-zinc-900"
                    >
                      {data.hours}h
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
