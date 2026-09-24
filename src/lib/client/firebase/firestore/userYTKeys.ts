import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config";
import { EncryptedKey } from "@/lib/client/crypto/apiKeyEncryption";

const getUserKeysCol = (uid: string) => collection(db, "users", uid, "yt_api_keys");

export interface StoredYTKey {
  id: string;
  label: string;
  ciphertext: string;
  iv: string;
  createdAt: number;
}

/** Lưu 1 encrypted key vào Firestore của user */
export async function saveUserYTKey(uid: string, label: string, encrypted: EncryptedKey): Promise<string> {
  const colRef = getUserKeysCol(uid);
  const docRef = doc(colRef); // auto-ID
  await setDoc(docRef, {
    label,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

/** Lấy toàn bộ encrypted keys của user */
export async function getUserYTKeys(uid: string): Promise<StoredYTKey[]> {
  const snap = await getDocs(getUserKeysCol(uid));
  const list: StoredYTKey[] = [];
  snap.forEach((d) => {
    const data = d.data();
    list.push({
      id: d.id,
      label: data.label || "API Key",
      ciphertext: data.ciphertext,
      iv: data.iv,
      createdAt: data.createdAt?.toMillis?.() || Date.now()
    });
  });
  // Sắp xếp theo thời gian tạo
  return list.sort((a, b) => a.createdAt - b.createdAt);
}

/** Xóa 1 key */
export async function deleteUserYTKey(uid: string, keyId: string): Promise<void> {
  await deleteDoc(doc(getUserKeysCol(uid), keyId));
}
