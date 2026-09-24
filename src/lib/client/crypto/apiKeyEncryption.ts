/**
 * Client-side AES-GCM 256-bit encryption for ytranscript API keys.
 *
 * Master key = random 256-bit key generated once, stored in localStorage.
 * It NEVER leaves the browser — the server never sees it.
 * Encrypted ciphertext is stored in Firestore.
 */

const MASTER_KEY_STORAGE = 'yt_master_key_v1';

// --- Master key management ---

async function importRawKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function getMasterKey(): Promise<CryptoKey> {
  // Try loading from localStorage
  const stored = localStorage.getItem(MASTER_KEY_STORAGE);
  if (stored) {
    try {
      const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0)).buffer;
      return await importRawKey(raw);
    } catch {
      // Corrupt → regenerate
    }
  }

  // Generate new master key
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const exported = await crypto.subtle.exportKey('raw', key);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  localStorage.setItem(MASTER_KEY_STORAGE, b64);
  return key;
}

/** Returns true if a master key exists in localStorage (i.e. this device has set up keys before) */
export function hasMasterKey(): boolean {
  return !!localStorage.getItem(MASTER_KEY_STORAGE);
}

// --- Encrypt / Decrypt ---

export interface EncryptedKey {
  ciphertext: string; // base64
  iv: string;         // base64
}

export async function encryptApiKey(plaintext: string): Promise<EncryptedKey> {
  const masterKey = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, masterKey, encoded);

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuf))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptApiKey(encrypted: EncryptedKey): Promise<string> {
  const masterKey = await getMasterKey();
  const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
  const cipherBuf = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0)).buffer;
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, masterKey, cipherBuf);
  return new TextDecoder().decode(plainBuf);
}

// --- Backup / Restore ---

export interface MasterKeyBackup {
  app: 'EchoChunk';
  version: 1;
  masterKey: string; // base64 raw key
  exportedAt: string; // ISO timestamp
}

/**
 * Download master key as a JSON backup file.
 * User should keep this file safe — it's the only way to decrypt keys on a new device.
 */
export function downloadMasterKeyBackup(): void {
  const raw = localStorage.getItem(MASTER_KEY_STORAGE);
  if (!raw) return;

  const backup: MasterKeyBackup = {
    app: 'EchoChunk',
    version: 1,
    masterKey: raw,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `echochunk-key-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Restore master key from a backup JSON file.
 * Returns true if successful, false if file is invalid.
 */
export async function importMasterKeyBackup(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const backup = JSON.parse(text) as Partial<MasterKeyBackup>;

    if (backup.app !== 'EchoChunk' || backup.version !== 1 || !backup.masterKey) {
      return false;
    }

    // Validate that it's a real AES-256 key (32 bytes = 256 bits)
    const raw = Uint8Array.from(atob(backup.masterKey), (c) => c.charCodeAt(0));
    if (raw.length !== 32) return false;

    // Test it works
    await importRawKey(raw.buffer);

    localStorage.setItem(MASTER_KEY_STORAGE, backup.masterKey);
    return true;
  } catch {
    return false;
  }
}

