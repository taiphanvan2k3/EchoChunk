'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserYTKeys, StoredYTKey } from '@/lib/client/firebase/firestore/userYTKeys';
import { decryptApiKey } from '@/lib/client/crypto/apiKeyEncryption';

interface UseUserYTKeysResult {
  /** Danh sách keys đã decrypt, sẵn sàng gửi cho server */
  decryptedKeys: string[];
  /** Danh sách metadata (để hiển thị UI, không có plaintext) */
  storedKeys: StoredYTKey[];
  isLoading: boolean;
  reload: () => void;
}

export function useUserYTKeys(): UseUserYTKeysResult {
  const { user } = useAuth();
  const [storedKeys, setStoredKeys] = useState<StoredYTKey[]>([]);
  const [decryptedKeys, setDecryptedKeys] = useState<string[]>([]);
  // Start loading immediately so consumers don't flash empty state
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!user?.uid) return; // reset happens naturally via dependency change

    let cancelled = false;


    getUserYTKeys(user.uid)
      .then(async (keys: StoredYTKey[]) => {
        if (cancelled) return;
        setStoredKeys(keys);

        // Decrypt tất cả client-side
        const decrypted: string[] = [];
        for (const k of keys) {
          try {
            const plain = await decryptApiKey({ ciphertext: k.ciphertext, iv: k.iv });
            if (plain) decrypted.push(plain);
          } catch {
            // Key bị hỏng (ví dụ: masterKey đổi thiết bị) — bỏ qua
          }
        }
        if (!cancelled) setDecryptedKeys(decrypted);
      })
      .catch(() => {
        if (!cancelled) {
          setStoredKeys([]);
          setDecryptedKeys([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.uid, version]);

  return { decryptedKeys, storedKeys, isLoading, reload };
}
