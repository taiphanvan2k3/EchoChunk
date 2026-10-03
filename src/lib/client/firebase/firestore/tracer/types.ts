/**
 * Kiểu thao tác Firestore được hỗ trợ tracing
 */
export type FirestoreOpType =
  | "getDoc"
  | "getDocs"
  | "setDoc"
  | "updateDoc"
  | "deleteDoc"
  | "writeBatch";

/**
 * Bản ghi chi tiết của 1 thao tác Firestore
 */
export interface FirestoreTraceLog {
  id: string;
  timestamp: number;
  operation: FirestoreOpType;
  path: string;
  docCount: number;
  durationMs: number;
  caller?: string;
  status: "success" | "error";
  errorDetails?: string;
}

/**
 * Thống kê tổng hợp Quota trong phiên làm việc
 */
export interface FirestoreSessionMetrics {
  totalReads: number;
  totalWrites: number;
  totalDeletes: number;
  history: FirestoreTraceLog[];
  reset: () => void;
  summary: () => void;
}
