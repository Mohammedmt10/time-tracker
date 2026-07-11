"use client";

import { useState } from "react";
import {
  Search,
  Trash2,
  Calendar,
  FileDown,
  Clock,
  Edit2,
  Check,
  X,
  ChevronDown,
} from "lucide-react";

interface TimeLog {
  id: string;
  description: string;
  project: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
}

interface LogHistoryProps {
  logs: TimeLog[];
  onDeleteLog: (id: string | string[]) => void;
  onUpdateLog: (id: string | string[], description: string) => void;
}

export default function LogHistory({
  logs,
  onDeleteLog,
  onUpdateLog,
}: LogHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilterTask, setSelectedFilterTask] = useState("All Tasks");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");

  const formatDuration = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;

    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (remainingSecs > 0 || parts.length === 0)
      parts.push(`${remainingSecs}s`);

    return parts.join(" ");
  };

  const formatSessionDate = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);

    const startFmt = start.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const endFmt = end.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    if (startFmt === endFmt) {
      return startFmt;
    }

    return `${startFmt} - ${endFmt}`;
  };

  // Start editing
  const startEditing = (session: { id: string; description: string }) => {
    setEditingId(session.id);
    setEditDesc(session.description);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDesc("");
  };

  const saveEdit = (idOrIds: string | string[]) => {
    onUpdateLog(idOrIds, editDesc.trim() || "Untitled Task");
    setEditingId(null);
  };

  // Filter and Search logic
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesTask =
      selectedFilterTask === "All Tasks" ||
      log.description === selectedFilterTask;
    return matchesSearch && matchesTask;
  });

  // Reconstruct sessions from contiguous segments
  const groupLogsIntoSessions = (rawLogs: TimeLog[]) => {
    if (rawLogs.length === 0) return [];

    // Sort by startTime ascending to easily find contiguous segments
    const sorted = [...rawLogs].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const sessions: {
      id: string;
      description: string;
      project: string;
      startTime: string;
      endTime: string;
      duration: number;
      segmentIds: string[];
    }[] = [];

    for (const log of sorted) {
      // Find if there is an existing session that ends exactly when this log starts,
      // and has the same description and project
      const matchingSessionIndex = sessions.findIndex(
        (s) =>
          s.description === log.description &&
          s.project === log.project &&
          s.endTime === log.startTime
      );

      if (matchingSessionIndex !== -1) {
        // Merge into the existing session
        sessions[matchingSessionIndex].endTime = log.endTime;
        sessions[matchingSessionIndex].duration += log.duration;
        sessions[matchingSessionIndex].segmentIds.push(log.id);
      } else {
        // Create a new session
        sessions.push({
          id: log.id,
          description: log.description,
          project: log.project,
          startTime: log.startTime,
          endTime: log.endTime,
          duration: log.duration,
          segmentIds: [log.id],
        });
      }
    }

    // Sort sessions back to descending order of startTime (newest first)
    return sessions.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  };

  const groupedSessions = groupLogsIntoSessions(filteredLogs);

  // Get unique task descriptions dynamically
  const uniqueTasks = [
    "All Tasks",
    ...Array.from(
      new Set(logs.map((log) => log.description.trim() || "Untitled Task")),
    ).sort(),
  ];

  // Export to CSV Function
  const exportToCSV = () => {
    if (logs.length === 0) return;
    const headers = [
      "ID",
      "Description",
      "Project",
      "Start Time",
      "End Time",
      "Duration (seconds)",
      "Duration (formatted)",
    ];
    const rows = logs.map((log) => [
      log.id,
      `"${log.description.replace(/"/g, '""')}"`,
      `"${log.project}"`,
      log.startTime,
      log.endTime,
      log.duration,
      formatDuration(log.duration),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `worktime_logs_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON Function
  const exportToJSON = () => {
    if (logs.length === 0) return;
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(logs, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute(
      "download",
      `worktime_logs_${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl bg-card-bg p-6 shadow-card">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Log History
          </h2>
          <p className="text-xs text-text-secondary">
            Browse and manage all of your tracked time blocks
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={logs.length === 0}
            onClick={exportToCSV}
            className="flex items-center gap-1.5 rounded-lg bg-input-bg px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-panel-bg focus:outline-none transition-all disabled:opacity-50"
          >
            <FileDown size={14} />
            Export CSV
          </button>
          <button
            type="button"
            disabled={logs.length === 0}
            onClick={exportToJSON}
            className="flex items-center gap-1.5 rounded-lg bg-input-bg px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-panel-bg focus:outline-none transition-all disabled:opacity-50"
          >
            <FileDown size={14} />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filter and Search Inputs */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute top-2.5 left-3 text-text-secondary/50"
            size={16}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-lg bg-input-bg py-2 pr-4 pl-9 text-sm outline-none transition-all focus:bg-input-bg/70"
          />
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex w-full items-center justify-between gap-2 rounded-lg bg-input-bg px-3 py-2 text-sm font-semibold text-text-primary outline-none transition-all hover:bg-panel-bg focus:ring-2 focus:ring-indigo-500/20"
          >
            <span className="truncate text-left flex-1 pr-1">
              {selectedFilterTask}
            </span>
            <ChevronDown
              size={14}
              className={`text-text-secondary shrink-0 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDropdownOpen && (
            <>
              {/* Click outside backdrop */}
              <div
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setIsDropdownOpen(false)}
              />

              {/* Dropdown menu */}
              <div className="absolute right-0 mt-1.5 z-30 w-max min-w-full max-w-xs rounded-xl border border-panel-bg bg-card-bg p-1 shadow-lg ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150">
                {uniqueTasks.map((task) => (
                  <button
                    key={task}
                    type="button"
                    onClick={() => {
                      setSelectedFilterTask(task);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                      selectedFilterTask === task
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "text-text-secondary hover:bg-panel-bg hover:text-text-primary"
                    }`}
                  >
                    <span className="whitespace-nowrap pr-2">{task}</span>
                    {selectedFilterTask === task && (
                      <Check
                        size={12}
                        className="shrink-0 text-indigo-600 dark:text-indigo-400"
                      />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Logs Table / Grid */}
      <div className="mt-6">
        {groupedSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="text-text-secondary/40" size={40} />
            <span className="mt-3 text-sm font-semibold text-text-secondary">
              No logs found
            </span>
            <span className="text-xs text-text-secondary/70">
              {logs.length === 0
                ? "Start tracking to see your logs here."
                : "Try adjusting your search filters."}
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="hidden w-full min-w-[600px] border-collapse text-left text-sm md:table">
              <thead>
                <tr className="bg-panel-bg/40 text-text-secondary">
                  <th className="py-2.5 px-4 font-semibold rounded-l-lg">
                    Task
                  </th>
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-4 font-semibold text-right">
                    Duration
                  </th>
                  <th className="py-2.5 px-4 font-semibold text-center w-[100px] rounded-r-lg">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-bg/20">
                {groupedSessions.map((session) => {
                  const isEditing = editingId === session.id;

                  return (
                    <tr key={session.id} className="hover:bg-panel-bg/30">
                      {/* Description cell */}
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full rounded-md bg-input-bg px-2 py-1 text-sm outline-none"
                          />
                        ) : (
                          <span className="font-medium text-text-primary">
                            {session.description}
                          </span>
                        )}
                      </td>

                      {/* Date cell */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} />
                          {formatSessionDate(session.startTime, session.endTime)}
                        </div>
                      </td>

                      {/* Duration cell */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-text-primary">
                        {formatDuration(session.duration)}
                      </td>

                      {/* Action buttons cell */}
                      <td className="py-3.5 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => saveEdit(session.segmentIds)}
                              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              title="Save changes"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="rounded p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => startEditing(session)}
                              className="rounded p-1 text-text-secondary hover:bg-panel-bg hover:text-text-primary"
                              title="Edit description/project"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => onDeleteLog(session.segmentIds)}
                              className="rounded p-1 text-text-secondary hover:bg-rose-550/20 hover:text-rose-600"
                              title="Delete log"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile List View */}
            <div className="flex flex-col gap-3 md:hidden">
              {groupedSessions.map((session) => {
                const isEditing = editingId === session.id;

                return (
                  <div key={session.id} className="rounded-xl bg-panel-bg/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full rounded-md bg-input-bg px-2 py-1 text-sm outline-none"
                          />
                        ) : (
                          <span className="font-semibold text-text-primary">
                            {session.description}
                          </span>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1 text-[11px] text-text-secondary">
                            <Clock size={11} />
                            <span>{formatDuration(session.duration)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Edit controls for mobile */}
                      <div>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => saveEdit(session.segmentIds)}
                              className="rounded p-1 text-emerald-600"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="rounded p-1 text-rose-600"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditing(session)}
                              className="rounded p-1 text-text-secondary"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => onDeleteLog(session.segmentIds)}
                              className="rounded p-1 text-text-secondary"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap justify-between pt-3 text-[11px] text-text-secondary">
                      <span>{formatSessionDate(session.startTime, session.endTime)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
