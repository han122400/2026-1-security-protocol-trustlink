/**
 * TrustLink - IndexedDB 키 저장소
 * 
 * 사용자의 개인키를 브라우저 IndexedDB에 안전하게 보관합니다.
 * 개인키는 절대 서버로 전송되지 않습니다.
 */

const DB_NAME = 'trustlink-keystore';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

/** IndexedDB 연결 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredKeyPair {
  id: string; // userId 기반 키 식별자
  signPrivateKey: JsonWebKey;   // 서명용 개인키 (JWK)
  encryptPrivateKey: JsonWebKey; // 복호화용 개인키 (JWK)
  createdAt: string;
}

/** 키쌍 저장 */
export async function saveKeyPair(keyPair: StoredKeyPair): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(keyPair);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 키쌍 로드 */
export async function loadKeyPair(userId: string): Promise<StoredKeyPair | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(`keys-${userId}`);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/** 키쌍 삭제 */
export async function deleteKeyPair(userId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(`keys-${userId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 키쌍 존재 여부 확인 */
export async function hasKeyPair(userId: string): Promise<boolean> {
  const keyPair = await loadKeyPair(userId);
  return keyPair !== null;
}
