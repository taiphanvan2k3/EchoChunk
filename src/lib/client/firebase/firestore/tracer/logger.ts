import { FirestoreTraceLog } from "./types";

export const OVERFETCH_THRESHOLD = 20;

const BADGE_STYLES = {
  read: "background: #0284c7; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 600;",
  query: "background: #7c3aed; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 600;",
  write: "background: #16a34a; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 600;",
  update: "background: #d97706; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 600;",
  delete: "background: #dc2626; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 600;",
  batch: "background: #0d9488; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 600;",
  error: "background: #dc2626; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 600;",
  overfetchAlert: "background: #b91c1c; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold;",
};

const TEXT_STYLES = {
  readPath: "color: #38bdf8; font-weight: 500;",
  queryPath: "color: #c084fc; font-weight: 500;",
  writePath: "color: #4ade80; font-weight: 500;",
  updatePath: "color: #fbbf24; font-weight: 500;",
  deletePath: "color: #f87171; font-weight: 500;",
  batchPath: "color: #2dd4bf; font-weight: 500;",
  duration: "color: #94a3b8;",
  caller: "color: #a855f7; font-weight: 500;",
  errorMsg: "color: #f87171; font-weight: bold;",
};

/**
 * Ghi log thao tác Firestore ra Chrome DevTools Console với style trực quan
 */
export function printConsoleTrace(log: FirestoreTraceLog): void {
  if (typeof console === "undefined") return;

  const callerText = log.caller ? ` — ${log.caller}` : "";

  if (log.status === "error") {
    console.error(
      `%c[Firestore ERROR]%c ${log.path} %c(${log.durationMs}ms)%c${callerText}\n${log.errorDetails}`,
      BADGE_STYLES.error,
      TEXT_STYLES.errorMsg,
      TEXT_STYLES.duration,
      TEXT_STYLES.caller
    );
    return;
  }

  switch (log.operation) {
    case "getDoc":
      console.log(
        `%c[Firestore READ: ${log.docCount} doc]%c ${log.path} %c(${log.durationMs}ms)%c${callerText}`,
        BADGE_STYLES.read,
        TEXT_STYLES.readPath,
        TEXT_STYLES.duration,
        TEXT_STYLES.caller
      );
      break;

    case "getDocs":
      console.log(
        `%c[Firestore QUERY: ${log.docCount} docs]%c ${log.path} %c(${log.durationMs}ms)%c${callerText}`,
        BADGE_STYLES.query,
        TEXT_STYLES.queryPath,
        TEXT_STYLES.duration,
        TEXT_STYLES.caller
      );

      // Cảnh báo Overfetch nếu query nạp quá nhiều docs
      if (log.docCount > OVERFETCH_THRESHOLD) {
        console.warn(
          `%c🚨 [Firestore OVERFETCH WARNING] Truy vấn tại "${log.path}" nạp ${log.docCount} documents! Tốn ${log.docCount} billable reads!`,
          BADGE_STYLES.overfetchAlert
        );
      }
      break;

    case "setDoc":
      console.log(
        `%c[Firestore WRITE]%c ${log.path} %c(${log.durationMs}ms)%c${callerText}`,
        BADGE_STYLES.write,
        TEXT_STYLES.writePath,
        TEXT_STYLES.duration,
        TEXT_STYLES.caller
      );
      break;

    case "updateDoc":
      console.log(
        `%c[Firestore UPDATE]%c ${log.path} %c(${log.durationMs}ms)%c${callerText}`,
        BADGE_STYLES.update,
        TEXT_STYLES.updatePath,
        TEXT_STYLES.duration,
        TEXT_STYLES.caller
      );
      break;

    case "deleteDoc":
      console.log(
        `%c[Firestore DELETE]%c ${log.path} %c(${log.durationMs}ms)%c${callerText}`,
        BADGE_STYLES.delete,
        TEXT_STYLES.deletePath,
        TEXT_STYLES.duration,
        TEXT_STYLES.caller
      );
      break;

    case "writeBatch":
      console.log(
        `%c[Firestore BATCH: ${log.docCount} ops]%c ${log.path} %c(${log.durationMs}ms)%c${callerText}`,
        BADGE_STYLES.batch,
        TEXT_STYLES.batchPath,
        TEXT_STYLES.duration,
        TEXT_STYLES.caller
      );
      break;
  }
}
