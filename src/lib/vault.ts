import type { RastaProject } from './project';

const DB_NAME = 'rastaphi-project-vault';
const DB_VERSION = 1;
const STORE = 'projects';

export interface SavedProject {
  id: string;
  title: string;
  savedAt: string;
  sourceName: string;
}

interface StoredProject extends SavedProject {
  project: RastaProject;
}

function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Local project storage is not available in this browser.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Unable to open the local project vault.'));
    request.onblocked = () => reject(new Error('The project vault is open in another tab. Close it and retry.'));
  });
}

function transaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (v: T) => void, reject: (e: Error) => void) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let finished = false;
    const tx = db.transaction(STORE, mode);
    const fail = () => {
      if (!finished) {
        finished = true;
        reject(new Error('Project vault operation failed. Check browser storage permissions and available space.'));
      }
    };
    tx.onerror = fail;
    tx.onabort = fail;
    action(tx.objectStore(STORE), value => {
      tx.oncomplete = () => {
        if (!finished) { finished = true; resolve(value); }
      };
    }, error => {
      if (!finished) { finished = true; reject(error); }
      try { tx.abort(); } catch { /* may have completed */ }
    });
  });
}

async function withDatabase<T>(run: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await database();
  try { return await run(db); }
  finally { db.close(); }
}

export async function listSavedProjects(): Promise<SavedProject[]> {
  return withDatabase(db => transaction<SavedProject[]>(db, 'readonly', (store, resolve, reject) => {
    const rows: SavedProject[] = [];
    const request = store.openCursor();
    request.onerror = () => reject(new Error('Could not read the project list.'));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const value = cursor.value as StoredProject;
        rows.push({ id: value.id, title: value.title, savedAt: value.savedAt, sourceName: value.sourceName });
        cursor.continue();
      } else resolve(rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
    };
  }));
}

export async function storeProject(project: RastaProject): Promise<string> {
  const id = crypto.randomUUID();
  const row: StoredProject = {
    id, title: project.title, savedAt: project.savedAt,
    sourceName: project.asset.name, project,
  };
  await withDatabase(db => transaction<void>(db, 'readwrite', (store, resolve, reject) => {
    const request = store.put(row);
    request.onerror = () => reject(new Error('Could not save project. Your browser may be out of local space.'));
    request.onsuccess = () => resolve();
  }));
  return id;
}

export async function readProject(id: string): Promise<RastaProject> {
  return withDatabase(db => transaction<RastaProject>(db, 'readonly', (store, resolve, reject) => {
    const request = store.get(id);
    request.onerror = () => reject(new Error('Unable to read this saved project.'));
    request.onsuccess = () => {
      const row = request.result as StoredProject | undefined;
      if (!row) reject(new Error('This project no longer exists in your local vault.'));
      else resolve(row.project);
    };
  }));
}

export async function deleteProject(id: string): Promise<void> {
  return withDatabase(db => transaction<void>(db, 'readwrite', (store, resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => reject(new Error('Unable to remove project from local storage.'));
    request.onsuccess = () => resolve();
  }));
}
