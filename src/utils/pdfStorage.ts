import { openDB } from 'idb';

// set database name
const DB_NAME = 'ctr-pdf-storage';
// set store name
const STORE_NAME = 'pdfs';
// set database version
const DB_VERSION = 2; // Increment version for schema update

interface PDFData {
  id: string;
  pdf: Blob;
  preview: Blob | null;
  metadata: {
    filename: string;
    date: string;
    crewNumber: string;
    fireName: string;
    fireNumber: string;
  };
  timestamp: string;
}

// Initialize the database
async function initDB() {
  console.log('Initializing IndexedDB...');
  return openDB<PDFData>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      console.log('Upgrading database from version', oldVersion, 'to', DB_VERSION);
      
      // Create store if it doesn't exist (version 1)
      if (oldVersion < 1) {
        console.log('Creating object store...');
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      
      // Add preview field to existing records (version 2)
      if (oldVersion < 2) {
        console.log('Adding preview field to existing records...');
        // No need to update existing records, they will get preview = null by default
        // when accessed through TypeScript interface
      }
    },
  });
}

// Store a PDF in IndexedDB
export async function storePDF(pdfBlob: Blob, pngPreview: Blob | null, metadata: {
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
      preview: pngPreview,
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