"use client";

import React, { useState, useEffect } from "react";
import {
  firestoreSessionMetrics,
  FirestoreTraceLog
} from "@/lib/client/firebase/firestore/tracer";

/**
 * FirestoreQuotaTracer
 * Floating dev tool theo dõi thời gian thực số lượng Firestore reads, writes, deletes
 * và cảnh báo các truy vấn overfetch trong môi trường phát triển (development).
 */
export function FirestoreQuotaTracer() {
  const isDev = process.env.NODE_ENV === "development";

  const [metrics, setMetrics] = useState({
    reads: 0,
    writes: 0,
    deletes: 0,
    history: [] as FirestoreTraceLog[],
    lastDuration: 0
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isAlert, setIsAlert] = useState(false);

  useEffect(() => {
    if (!isDev) return;

    // Lắng nghe sự kiện ghi trace từ tracer
    const handleTrace = (e: Event) => {
      const customEvent = e as CustomEvent<FirestoreTraceLog>;
      const log = customEvent.detail;

      // firestoreSessionMetrics là biến toàn cục đã tính tổng số lượt, nên ở đây set state để re-render UI
      setMetrics({
        reads: firestoreSessionMetrics.totalReads,
        writes: firestoreSessionMetrics.totalWrites,
        deletes: firestoreSessionMetrics.totalDeletes,
        history: [...firestoreSessionMetrics.history],
        lastDuration: log?.durationMs || 0
      });

      if (log?.docCount > 20) {
        setIsAlert(true);
        setTimeout(() => setIsAlert(false), 3000);
      }
    };

    const handleReset = () => {
      setMetrics({
        reads: 0,
        writes: 0,
        deletes: 0,
        history: [],
        lastDuration: 0
      });
    };

    window.addEventListener("firestore-trace", handleTrace);
    window.addEventListener("firestore-trace-reset", handleReset);

    return () => {
      window.removeEventListener("firestore-trace", handleTrace);
      window.removeEventListener("firestore-trace-reset", handleReset);
    };
  }, [isDev]);

  if (!isDev) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans antialiased text-xs">
      {/* Pill Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-2xl backdrop-blur-md transition-all select-none ${
          isAlert
            ? "bg-rose-950/90 text-rose-200 border-rose-500 animate-pulse"
            : "bg-slate-900/90 text-slate-200 border-slate-700/80 hover:bg-slate-800"
        }`}
        title="Nhấp để xem chi tiết Firestore Quota Tracer"
      >
        <span className="text-sm">🔥</span>
        <span className="font-semibold text-sky-400">R: {metrics.reads}</span>
        <span className="text-slate-500">|</span>
        <span className="font-semibold text-emerald-400">W: {metrics.writes}</span>
        {metrics.deletes > 0 && (
          <>
            <span className="text-slate-500">|</span>
            <span className="font-semibold text-rose-400">D: {metrics.deletes}</span>
          </>
        )}
        {metrics.lastDuration > 0 && (
          <>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 font-mono">{metrics.lastDuration}ms</span>
          </>
        )}
      </button>

      {/* Slide-over Popover Panel */}
      {isOpen && (
        <div className="absolute bottom-10 right-0 w-96 max-h-[500px] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <span className="text-base">🔥</span>
              <div>
                <h4 className="font-bold text-slate-100 text-xs">Firestore Quota Tracer</h4>
                <p className="text-[10px] text-slate-400">Real-time Session Observability</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => firestoreSessionMetrics.summary()}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-[10px] font-medium transition-colors"
                title="In bảng thống kê chi tiết ra Console"
              >
                Summary
              </button>
              <button
                onClick={() => firestoreSessionMetrics.reset()}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded text-[10px] font-medium transition-colors"
                title="Reset lại bộ đếm về 0"
              >
                Reset
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-200 rounded">
                ✕
              </button>
            </div>
          </div>

          {/* Metrics Summary Strip */}
          <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950/30 border-b border-slate-800/80 text-center">
            <div className="p-1.5 rounded-lg bg-sky-950/40 border border-sky-800/30">
              <div className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold">Reads</div>
              <div className="text-base font-bold text-sky-200">{metrics.reads}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/30">
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Writes</div>
              <div className="text-base font-bold text-emerald-200">{metrics.writes}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-purple-950/40 border border-purple-800/30">
              <div className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">Total Ops</div>
              <div className="text-base font-bold text-purple-200">{metrics.history.length}</div>
            </div>
          </div>

          {/* Operations History List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-72 divide-y divide-slate-800/40">
            {metrics.history.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Chưa có thao tác Firestore nào được thực thi.
              </div>
            ) : (
              metrics.history.map((log) => {
                const isOverfetch = log.docCount > 20;
                let opBadgeClass = "bg-sky-500/20 text-sky-300 border-sky-500/30";
                if (log.operation === "getDocs") opBadgeClass = "bg-purple-500/20 text-purple-300 border-purple-500/30";
                else if (log.operation === "setDoc")
                  opBadgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
                else if (log.operation === "updateDoc")
                  opBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";
                else if (log.operation === "deleteDoc")
                  opBadgeClass = "bg-rose-500/20 text-rose-300 border-rose-500/30";
                else if (log.operation === "writeBatch")
                  opBadgeClass = "bg-teal-500/20 text-teal-300 border-teal-500/30";

                return (
                  <div key={log.id} className="pt-1.5 first:pt-0 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${opBadgeClass}`}
                        >
                          {log.operation}
                        </span>
                        {log.caller && (
                          <span
                            className="px-1 py-0.2 rounded text-[10px] font-mono font-medium truncate max-w-[150px] text-purple-300"
                          >
                            {log.caller}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <span>{log.durationMs}ms</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 truncate font-mono text-[10px] max-w-[260px]" title={log.path}>
                        {log.path}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-semibold ${
                          isOverfetch ? "text-rose-400 font-bold" : "text-slate-400"
                        }`}
                      >
                        {log.docCount} {log.docCount === 1 ? "doc" : "docs"}
                        {isOverfetch && " ⚠️"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 text-center text-[10px] text-slate-500">
            Chỉ hiển thị trong môi trường Development (0đ production overhead)
          </div>
        </div>
      )}
    </div>
  );
}
