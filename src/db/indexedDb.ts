// Code for handling storage in IndexedDB
import { openDB } from 'idb';

// define constraints for database
const DB_NAME = 'pwapoc-db';
const EVENTS_STORE = 'events';
const CSV_STORE = 'csv_data';

// 
export interface CSVEntry {
  id?: number;
  name: string;
  isEmpty: boolean;
  lastModified: number;
}

// creates IndexedDB with version 1
async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      // Create events store
      if (!db.objectStoreNames.contains(EVENTS_STORE)) {
        db.createObjectStore(EVENTS_STORE, { keyPath: 'id', autoIncrement: true });
      }
      
      // Create CSV store
      if (!db.objectStoreNames.contains(CSV_STORE)) {
        const csvStore = db.createObjectStore(CSV_STORE, { keyPath: 'id', autoIncrement: true });
        csvStore.createIndex('lastModified', 'lastModified', { unique: false });
      }
    },
  });
}

// CSV Data Operations
export async function saveCSVData(entries: CSVEntry[]) {
  const db = await getDb();
  const tx = db.transaction(CSV_STORE, 'readwrite');
  const store = tx.objectStore(CSV_STORE);
  
  // Clear existing data
  await store.clear();
  
  // Add new entries with timestamps
  const timestamp = Date.now();
  for (const entry of entries) {
    await store.add({
      ...entry,
      lastModified: timestamp
    });
  }
  
  await tx.done;
  return timestamp;
}

export async function getCSVData(): Promise<CSVEntry[]> {
  const db = await getDb();
  const tx = db.transaction(CSV_STORE, 'readonly');
  const store = tx.objectStore(CSV_STORE);
  return store.getAll();
}

export async function getLastModified(): Promise<number> {
  const db = await getDb();
  const tx = db.transaction(CSV_STORE, 'readonly');
  const store = tx.objectStore(CSV_STORE);
  const index = store.index('lastModified');
  const entries = await index.getAll();
  return entries.length > 0 ? entries[entries.length - 1].lastModified : 0;
}

// Event Operations (existing code)
export async function saveEvent(event: any) {
  const db = await getDb();
  return db.add(EVENTS_STORE, event);
}

export async function getAllEvents() {
  const db = await getDb();
  return db.getAll(EVENTS_STORE);
} 