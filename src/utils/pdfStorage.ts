import { openDB } from 'idb';

const DB_NAME = 'ctr-pdf-storage';
const STORE_NAME = 'pdfs';
const DB_VERSION = 1;

// Initialize the database
async function initDB() {
  console.log('Initializing IndexedDB...');
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      console.log('Upgrading database...');
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.log('Creating object store...');
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

// Store a PDF in IndexedDB
export async function storePDF(pdfBlob: Blob, metadata: {
  filename: string;
  date: string;
  crewNumber: string;
  fireName: string;
  fireNumber: string;
}) {
  console.log('Storing PDF in IndexedDB...', metadata);
  const db = await initDB();
  const id = `${metadata.date}_${metadata.crewNumber}_${metadata.fireName}_${metadata.fireNumber}`;
  
  try {
    await db.put(STORE_NAME, {
      id,
      pdf: pdfBlob,
      metadata,
      timestamp: new Date().toISOString()
    });
    console.log('PDF stored successfully with ID:', id);
    return id;
  } catch (error) {
    console.error('Error storing PDF:', error);
    throw error;
  }
}

// Retrieve a PDF from IndexedDB
export async function getPDF(id: string) {
  console.log('Retrieving PDF from IndexedDB:', id);
  const db = await initDB();
  const pdf = await db.get(STORE_NAME, id);
  console.log('Retrieved PDF:', pdf ? 'Found' : 'Not found');
  return pdf;
}

// List all stored PDFs
export async function listPDFs() {
  console.log('Listing all PDFs from IndexedDB...');
  try {
    const db = await initDB();
    console.log('Database initialized successfully');
    
    const pdfs = await db.getAll(STORE_NAME);
    console.log('Found PDFs:', pdfs.length);
    console.log('PDFs data:', pdfs);
    
    return pdfs;
  } catch (error) {
    console.error('Error in listPDFs:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

// Delete a PDF from IndexedDB
export async function deletePDF(id: string) {
  console.log('Deleting PDF from IndexedDB:', id);
  const db = await initDB();
  await db.delete(STORE_NAME, id);
  console.log('PDF deleted successfully');
} 