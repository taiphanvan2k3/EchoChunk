import {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  DocumentReference,
  DocumentData,
  Query,
  WithFieldValue,
  PartialWithFieldValue,
  UpdateData,
  SetOptions,
  DocumentSnapshot,
  QuerySnapshot,
  Firestore,
  WriteBatch
} from "firebase/firestore";
import { recordTrace } from "./metrics";

const isDev = process.env.NODE_ENV === "development";

/**
 * Underlying driver ủy quyền gọi trực tiếp đến Firestore SDK functions.
 *
 * MỤC ĐÍCH KIẾN TRÚC (Driver / Delegation Pattern):
 * 1. Khắc phục hạn chế Read-Only của ES Modules: Trong Node.js ESM, các hàm import từ bên thứ ba
 *    là immutable bindings, không thể monkey-patch trực tiếp bằng `firebase.getDoc = mockFn`.
 * 2. Phục vụ Unit Test: Cho phép bộ test tự động (test_tracer.mjs) stub/spy kết quả mà không cần
 *    kết nối mạng và không cần khởi chạy Firebase Local Emulator.
 * 3. Zero Overhead: Trong môi trường chạy thật, object này trỏ trực tiếp đến các hàm gốc của Firebase.
 */
export const firestoreDriver = {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch
};

/**
 * Traced getDoc wrapper
 */
export async function tracedGetDoc<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData>(
  docRef: DocumentReference<AppModelType, DbModelType>,
  caller?: string
): Promise<DocumentSnapshot<AppModelType, DbModelType>> {
  if (!isDev) return firestoreDriver.getDoc(docRef);

  const start = performance.now();
  try {
    const snap = await firestoreDriver.getDoc(docRef);
    const durationMs = Math.round(performance.now() - start);
    recordTrace({
      operation: "getDoc",
      path: docRef.path,
      docCount: snap.exists() ? 1 : 0,
      durationMs,
      caller,
      status: "success"
    });
    return snap;
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    recordTrace({
      operation: "getDoc",
      path: docRef.path,
      docCount: 0,
      durationMs,
      caller,
      status: "error",
      errorDetails: String(err)
    });
    throw err;
  }
}

/**
 * Traced getDocs wrapper
 */
export async function tracedGetDocs<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData>(
  queryRef: Query<AppModelType, DbModelType>,
  caller?: string
): Promise<QuerySnapshot<AppModelType, DbModelType>> {
  if (!isDev) return firestoreDriver.getDocs(queryRef);

  const start = performance.now();
  const path =
    (queryRef as unknown as { path?: string }).path ||
    (
      queryRef as unknown as { _query?: { path?: { canonicalString?: () => string } } }
    )._query?.path?.canonicalString?.() ||
    "query";

  try {
    const snap = await firestoreDriver.getDocs(queryRef);
    const durationMs = Math.round(performance.now() - start);
    recordTrace({
      operation: "getDocs",
      path,
      docCount: snap.size,
      durationMs,
      caller,
      status: "success"
    });
    return snap;
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    recordTrace({
      operation: "getDocs",
      path,
      docCount: 0,
      durationMs,
      caller,
      status: "error",
      errorDetails: String(err)
    });
    throw err;
  }
}

/**
 * Traced setDoc wrapper
 *
 * SỬ DỤNG FUNCTION OVERLOADING (Nạp chồng hàm):
 * Trong Firebase SDK gốc, setDoc có 2 cách dùng khác nhau:
 *   1. Ghi đè toàn bộ document (Full overwrite): dữ liệu phải đầy đủ (WithFieldValue<T>).
 *   2. Ghi hợp nhất (Merge): dữ liệu được phép khuyết thiếu (PartialWithFieldValue<T>), kèm SetOptions { merge: true }.
 *
 * Vì wrapper bổ sung thêm tham số `caller?: string` để ghi vết (tracing):
 *   - Ở Cách 1: tham số thứ 3 là `caller` (string).
 *   - Ở Cách 2: tham số thứ 3 là `options` (SetOptions), tham số thứ 4 mới là `caller` (string).
 *
 * 2 dòng khai báo bên dưới (Overload Signatures) KHÔNG có thân hàm, chỉ đóng vai trò định nghĩa
 * luật lệ cho TypeScript Compiler và IDE Autocomplete:
 *   - Giúp VS Code gợi ý tham số chính xác theo từng ngữ cảnh.
 *   - Ngăn chặn lỗi truyền đảo thứ tự tham số ngay tại thời điểm viết code (compile-time).
 *   - Khi build production ra file .js, các dòng overload này sẽ biến mất hoàn toàn (Zero Runtime Overhead).
 */

// Overload 1: Ghi đè toàn bộ (Full Overwrite) -> vị trí 3 là caller
export async function tracedSetDoc<AppModelType, DbModelType extends DocumentData = DocumentData>(
  docRef: DocumentReference<AppModelType, DbModelType>,
  data: WithFieldValue<AppModelType>,
  caller?: string
): Promise<void>;

// Overload 2: Ghi hợp nhất (Merge) -> vị trí 3 là SetOptions, vị trí 4 là caller
export async function tracedSetDoc<AppModelType, DbModelType extends DocumentData = DocumentData>(
  docRef: DocumentReference<AppModelType, DbModelType>,
  data: PartialWithFieldValue<AppModelType>,
  options: SetOptions,
  caller?: string
): Promise<void>;

// Implementation Signature: Thân hàm thực thi duy nhất gom logic của cả 2 cách dùng
export async function tracedSetDoc<AppModelType, DbModelType extends DocumentData = DocumentData>(
  docRef: DocumentReference<AppModelType, DbModelType>,
  data: WithFieldValue<AppModelType> | PartialWithFieldValue<AppModelType>,
  optionsOrCaller?: SetOptions | string,
  callerIfOptions?: string
): Promise<void> {
  // Tự động phân tích kiểu tham số thứ 3: nếu là object thì đó là SetOptions, nếu là string thì là caller
  const hasOptions = optionsOrCaller !== null && typeof optionsOrCaller === "object";
  const options = hasOptions ? (optionsOrCaller as SetOptions) : undefined;
  const caller = hasOptions ? callerIfOptions : (optionsOrCaller as string | undefined);

  if (!isDev) {
    return options
      ? firestoreDriver.setDoc(docRef, data as PartialWithFieldValue<AppModelType>, options)
      : firestoreDriver.setDoc(docRef, data as WithFieldValue<AppModelType>);
  }

  const start = performance.now();
  try {
    if (options) {
      await firestoreDriver.setDoc(docRef, data as PartialWithFieldValue<AppModelType>, options);
    } else {
      await firestoreDriver.setDoc(docRef, data as WithFieldValue<AppModelType>);
    }
    const durationMs = Math.round(performance.now() - start);
    recordTrace({
      operation: "setDoc",
      path: docRef.path,
      docCount: 1,
      durationMs,
      caller,
      status: "success"
    });
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    recordTrace({
      operation: "setDoc",
      path: docRef.path,
      docCount: 0,
      durationMs,
      caller,
      status: "error",
      errorDetails: String(err)
    });
    throw err;
  }
}

/**
 * Traced updateDoc wrapper
 */
export async function tracedUpdateDoc<AppModelType, DbModelType extends DocumentData = DocumentData>(
  docRef: DocumentReference<AppModelType, DbModelType>,
  data: UpdateData<DbModelType>,
  caller?: string
): Promise<void> {
  if (!isDev) return firestoreDriver.updateDoc(docRef, data);

  const start = performance.now();
  try {
    await firestoreDriver.updateDoc(docRef, data);
    const durationMs = Math.round(performance.now() - start);

    recordTrace({
      operation: "updateDoc",
      path: docRef.path,
      docCount: 1,
      durationMs,
      caller,
      status: "success"
    });
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);

    recordTrace({
      operation: "updateDoc",
      path: docRef.path,
      docCount: 0,
      durationMs,
      caller,
      status: "error",
      errorDetails: String(err)
    });
    throw err;
  }
}

/**
 * Traced deleteDoc wrapper
 */
export async function tracedDeleteDoc<AppModelType, DbModelType extends DocumentData = DocumentData>(
  docRef: DocumentReference<AppModelType, DbModelType>,
  caller?: string
): Promise<void> {
  if (!isDev) return firestoreDriver.deleteDoc(docRef);

  const start = performance.now();
  try {
    await firestoreDriver.deleteDoc(docRef);
    const durationMs = Math.round(performance.now() - start);
    recordTrace({
      operation: "deleteDoc",
      path: docRef.path,
      docCount: 1,
      durationMs,
      caller,
      status: "success"
    });
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    recordTrace({
      operation: "deleteDoc",
      path: docRef.path,
      docCount: 0,
      durationMs,
      caller,
      status: "error",
      errorDetails: String(err)
    });
    throw err;
  }
}

/**
 * Traced writeBatch wrapper
 * Intercepts writeBatch instance methods to record operation metrics and maintain chaining.
 */
export function tracedWriteBatch(db: Firestore, caller?: string): WriteBatch {
  const batch = firestoreDriver.writeBatch(db);
  if (!isDev) return batch;

  let opCount = 0;
  const originalSet = batch.set.bind(batch);
  const originalUpdate = batch.update.bind(batch);
  const originalDelete = batch.delete.bind(batch);
  const originalCommit = batch.commit.bind(batch);

  // Decorate methods on the actual WriteBatch instance to preserve prototype & internals
  batch.set = ((...args: [DocumentReference<unknown>, WithFieldValue<unknown>]) => {
    opCount++;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalSet as any)(...args);
  }) as typeof batch.set;

  batch.update = ((...args: [DocumentReference<unknown>, UpdateData<unknown>]) => {
    opCount++;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalUpdate as any)(...args);
  }) as typeof batch.update;

  batch.delete = ((documentRef: DocumentReference<unknown>) => {
    opCount++;
    return originalDelete(documentRef);
  }) as typeof batch.delete;

  batch.commit = async () => {
    const start = performance.now();
    try {
      const res = await originalCommit();
      const durationMs = Math.round(performance.now() - start);
      recordTrace({
        operation: "writeBatch",
        path: "batch",
        docCount: opCount,
        durationMs,
        caller,
        status: "success"
      });
      return res;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      recordTrace({
        operation: "writeBatch",
        path: "batch",
        docCount: 0,
        durationMs,
        caller,
        status: "error",
        errorDetails: String(err)
      });
      throw err;
    }
  };

  return batch;
}
