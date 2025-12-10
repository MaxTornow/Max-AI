/**
 * TYLER - IndexedDB Video Storage
 * Persists video files across navigation using IndexedDB
 */

const DB_NAME = 'tyler_db';
const DB_VERSION = 1;
const STORE_NAME = 'videos';
const VIDEO_KEY = 'current_video';
const OUTPUT_KEY = 'output_video';

interface StoredVideo {
    key: string;
    file: File;
    name: string;
    type: string;
    size: number;
    lastModified: number;
}

/**
 * Open or create the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Failed to open IndexedDB'));
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

/**
 * Store a video file in IndexedDB
 */
export async function storeVideo(file: File): Promise<void> {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const storedVideo: StoredVideo = {
            key: VIDEO_KEY,
            file: file,
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
        };

        return new Promise((resolve, reject) => {
            const request = store.put(storedVideo);
            request.onsuccess = () => {
                db.close();
                resolve();
            };
            request.onerror = () => {
                db.close();
                reject(new Error('Failed to store video'));
            };
        });
    } catch (error) {
        console.warn('Failed to store video in IndexedDB:', error);
    }
}

/**
 * Retrieve the stored video file from IndexedDB
 */
export async function retrieveVideo(): Promise<File | null> {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(VIDEO_KEY);
            request.onsuccess = () => {
                db.close();
                const result = request.result as StoredVideo | undefined;
                if (result && result.file) {
                    // Reconstruct File object (IndexedDB preserves File objects)
                    resolve(result.file);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => {
                db.close();
                reject(new Error('Failed to retrieve video'));
            };
        });
    } catch (error) {
        console.warn('Failed to retrieve video from IndexedDB:', error);
        return null;
    }
}

/**
 * Clear the stored video from IndexedDB
 */
export async function clearStoredVideo(): Promise<void> {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.delete(VIDEO_KEY);
            request.onsuccess = () => {
                db.close();
                resolve();
            };
            request.onerror = () => {
                db.close();
                reject(new Error('Failed to clear video'));
            };
        });
    } catch (error) {
        console.warn('Failed to clear video from IndexedDB:', error);
    }
}

/**
 * Store the exported output video blob in IndexedDB
 */
export async function storeOutputVideo(blob: Blob): Promise<void> {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const storedOutput = {
            key: OUTPUT_KEY,
            blob: blob,
            type: blob.type,
            size: blob.size,
        };

        return new Promise((resolve, reject) => {
            const request = store.put(storedOutput);
            request.onsuccess = () => {
                db.close();
                resolve();
            };
            request.onerror = () => {
                db.close();
                reject(new Error('Failed to store output video'));
            };
        });
    } catch (error) {
        console.warn('Failed to store output video in IndexedDB:', error);
    }
}

/**
 * Retrieve the stored output video blob from IndexedDB
 */
export async function retrieveOutputVideo(): Promise<Blob | null> {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(OUTPUT_KEY);
            request.onsuccess = () => {
                db.close();
                const result = request.result;
                if (result && result.blob) {
                    resolve(result.blob);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => {
                db.close();
                reject(new Error('Failed to retrieve output video'));
            };
        });
    } catch (error) {
        console.warn('Failed to retrieve output video from IndexedDB:', error);
        return null;
    }
}

/**
 * Clear the stored output video from IndexedDB
 */
export async function clearOutputVideo(): Promise<void> {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.delete(OUTPUT_KEY);
            request.onsuccess = () => {
                db.close();
                resolve();
            };
            request.onerror = () => {
                db.close();
                reject(new Error('Failed to clear output video'));
            };
        });
    } catch (error) {
        console.warn('Failed to clear output video from IndexedDB:', error);
    }
}

/**
 * Clear all stored videos (input and output) from IndexedDB
 */
export async function clearAllVideos(): Promise<void> {
    await clearStoredVideo();
    await clearOutputVideo();
}
