import { openDB } from 'idb';

const DB_NAME = 'shift-clock-db';
const STORE_NAME = 'events';

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function saveEvent(event: { type: string; name: string; timestamp: string }) {
  const db = await getDb();
  await db.add(STORE_NAME, event);
}

export async function getAllEvents() {
  const db = await getDb();
  return db.getAll(STORE_NAME);
} 