export async function getPersistedHandle(): Promise<FileSystemDirectoryHandle | null> {
    return new Promise((resolve) => {
        const request = indexedDB.open('CodexArcana', 1);

        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }
        };

        request.onsuccess = (event: any) => {
            const db = event.target.result;
            const transaction = db.transaction('settings', 'readonly');
            const store = transaction.objectStore('settings');
            const getRequest = store.get('lastVaultHandle');

            getRequest.onsuccess = () => {
                resolve(getRequest.result || null);
            };
            getRequest.onerror = () => resolve(null);
        };

        request.onerror = () => resolve(null);
    });
}

export async function persistHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CodexArcana', 1);

        request.onsuccess = (event: any) => {
            const db = event.target.result;
            const transaction = db.transaction('settings', 'readwrite');
            const store = transaction.objectStore('settings');
            const putRequest = store.put(handle, 'lastVaultHandle');

            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}

export async function clearPersistedHandle(): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CodexArcana', 1);

        request.onsuccess = (event: any) => {
            const db = event.target.result;
            const transaction = db.transaction('settings', 'readwrite');
            const store = transaction.objectStore('settings');
            const deleteRequest = store.delete('lastVaultHandle');

            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}
