import { FirestoreSessionMetrics, FirestoreTraceLog } from "./types";
import { printConsoleTrace } from "./logger";

const isDev = process.env.NODE_ENV === "development";
const MAX_HISTORY_ITEMS = 100;

export const firestoreSessionMetrics: FirestoreSessionMetrics = {
  totalReads: 0,
  totalWrites: 0,
  totalDeletes: 0,
  history: [],
  reset() {
    firestoreSessionMetrics.totalReads = 0;
    firestoreSessionMetrics.totalWrites = 0;
    firestoreSessionMetrics.totalDeletes = 0;
    firestoreSessionMetrics.history = [];
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("firestore-trace-reset"));
      console.log(
        "%c[Firestore Tracer] Đã reset toàn bộ bộ đếm Quota session.",
        "color: #10b981; font-weight: bold;"
      );
    }
  },
  summary() {
    if (typeof console === "undefined" || !console.table) return;
    const summaryMap: Record<
      string,
      { Reads: number; Writes: number; Deletes: number; LatencyMs: number; Callers: string }
    > = {};

    firestoreSessionMetrics.history.forEach((h) => {
      if (!summaryMap[h.path]) {
        summaryMap[h.path] = { Reads: 0, Writes: 0, Deletes: 0, LatencyMs: 0, Callers: "" };
      }
      const entry = summaryMap[h.path];
      entry.LatencyMs += h.durationMs;
      if (h.caller && !entry.Callers.includes(h.caller)) {
        entry.Callers = entry.Callers ? `${entry.Callers}, ${h.caller}` : h.caller;
      }
      if (h.operation === "getDoc" || h.operation === "getDocs") {
        entry.Reads += h.docCount;
      } else if (
        h.operation === "setDoc" ||
        h.operation === "updateDoc" ||
        h.operation === "writeBatch"
      ) {
        entry.Writes += h.docCount;
      } else if (h.operation === "deleteDoc") {
        entry.Deletes += h.docCount;
      }
    });

    console.group("🔥 [Firestore Quota Audit Summary]");
    console.log(
      `Tổng số: %c${firestoreSessionMetrics.totalReads} Reads%c | %c${firestoreSessionMetrics.totalWrites} Writes%c | %c${firestoreSessionMetrics.totalDeletes} Deletes%c across ${firestoreSessionMetrics.history.length} operations`,
      "color: #38bdf8; font-weight: bold;",
      "color: inherit;",
      "color: #4ade80; font-weight: bold;",
      "color: inherit;",
      "color: #f87171; font-weight: bold;",
      "color: inherit;"
    );
    console.table(summaryMap);
    console.groupEnd();
  }
};

// Đăng ký toàn cục trên window khi dev
if (isDev && typeof window !== "undefined") {
  (
    window as unknown as { __FIRESTORE_METRICS__: FirestoreSessionMetrics }
  ).__FIRESTORE_METRICS__ = firestoreSessionMetrics;
}

/**
 * Ghi nhận một thao tác Firestore vào session metrics và bắn event
 */
export function recordTrace(logData: Omit<FirestoreTraceLog, "id" | "timestamp">): void {
  if (!isDev) return;

  const traceLog: FirestoreTraceLog = {
    ...logData,
    id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now()
  };

  // Cập nhật bộ đếm
  if (traceLog.operation === "getDoc" || traceLog.operation === "getDocs") {
    firestoreSessionMetrics.totalReads += traceLog.docCount;
  } else if (
    traceLog.operation === "setDoc" ||
    traceLog.operation === "updateDoc" ||
    traceLog.operation === "writeBatch"
  ) {
    firestoreSessionMetrics.totalWrites += traceLog.docCount;
  } else if (traceLog.operation === "deleteDoc") {
    firestoreSessionMetrics.totalDeletes += traceLog.docCount;
  }

  // Giới hạn bộ nhớ lịch sử
  firestoreSessionMetrics.history.unshift(traceLog);
  if (firestoreSessionMetrics.history.length > MAX_HISTORY_ITEMS) {
    firestoreSessionMetrics.history.pop();
  }

  // Bắn CustomEvent cho UI Dev HUD (khi ở browser)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("firestore-trace", { detail: traceLog }));
  }

  // In Console (Node.js Terminal trên Server hoặc Chrome DevTools trên Client)
  printConsoleTrace(traceLog);
}

