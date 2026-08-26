/**
 * Robust IndexedDB & Firebase Storage Cache for Work Submissions
 * Prevents LocalStorage 5MB Quota Exceeded and enables smooth cross-device sync.
 */
import { uploadFileToFirebaseStorage } from './firebase';

const DB_NAME = 'agaram_dhines_files_db';
const STORE_NAME = 'uploaded_work_files';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const getIDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
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
  return dbPromise;
};

export const saveFileToIndexedDB = async (id: string, fileData: string, fileName: string, fileType: string): Promise<void> => {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ id, fileData, fileName, fileType, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save warning:', err);
  }
};

export const getFileFromIndexedDB = async (id: string): Promise<{ fileData: string; fileName: string; fileType: string } | null> => {
  try {
    const db = await getIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB get warning:', err);
    return null;
  }
};

/**
 * High performance upload handler:
 * 1. Uploads to Firebase Storage if available for cross-device global availability.
 * 2. Saves in IndexedDB for instant offline and local download.
 */
export const processAndUploadWorkFile = async (
  file: File,
  uploadId: string,
  staffId: string
): Promise<{ fileUrl?: string; base64Data: string }> => {
  // Read base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  // Save to IndexedDB
  await saveFileToIndexedDB(uploadId, base64Data, file.name, file.type || 'application/octet-stream');

  let fileUrl: string | undefined = undefined;

  try {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `daily_uploads/${staffId}/${uploadId}_${sanitizedName}`;
    fileUrl = await uploadFileToFirebaseStorage(file, path);
  } catch (storageErr) {
    console.warn('Firebase Storage upload notice (using direct document / indexed fallback):', storageErr);
  }

  return { fileUrl, base64Data };
};
