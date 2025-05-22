// Add type declaration at the top of the file
declare global {
  interface ImportMeta {
    env: {
      BASE_URL: string;
      MODE: string;
      DEV: boolean;
      PROD: boolean;
    }
  }
}

import { PDFDocument } from 'pdf-lib';
import { mapToPDFFields } from './pdfFieldMapper';
import { generateExportFilename } from './filenameGenerator';
import { storePDF } from './pdfStorage';

interface PDFGenerationOptions {
  downloadImmediately?: boolean;
  returnBlob?: boolean;
}

// Fills the CTR PDF and either triggers a download or returns the PDF data
export async function fillCTRPDF(
  data: any[], 
  crewInfo: any, 
  options: PDFGenerationOptions = { downloadImmediately: true },
  pdfUrl = '/CTR_Fillable_Edited.pdf'
) {
  try {
    // Ensure the PDF URL is absolute and includes base path
    const basePath = import.meta.env.BASE_URL || '/';
    const absolutePdfUrl = pdfUrl.startsWith('http') ? pdfUrl : `${basePath}${pdfUrl.startsWith('/') ? pdfUrl.slice(1) : pdfUrl}`;
    
    // Add cache-busting query parameter and force network fetch
    const urlWithCacheBust = `${absolutePdfUrl}?t=${Date.now()}`;
    
    const response = await fetch(urlWithCacheBust, {
      cache: 'no-store', // Force network fetch
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error('PDF fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const form = pdfDoc.getForm();
    const fields = mapToPDFFields(data, crewInfo);

    // Debug: Log available form fields
    console.log('Available PDF form fields:', form.getFields().map(f => f.getName()));

    // Fill fields
    Object.entries(fields).forEach(([field, value]) => {
      try {
        console.log(`Attempting to fill field: ${field} with value: ${value}`);
        form.getTextField(field).setText(value);
      } catch (e) {
        // Field might not exist, skip or log
        console.warn(`Field ${field} not found in PDF:`, e);
      }
    });

    // Save PDF
    const filledPdfBytes = await pdfDoc.save();
    const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
    
    // Generate filename
    const filename = generateExportFilename({
      date: data[0]?.days[0]?.date || new Date().toISOString().split('T')[0],
      crewNumber: crewInfo.crewNumber || '',
      fireName: crewInfo.fireName || '',
      fireNumber: crewInfo.fireNumber || '',
      type: 'PDF'
    });

    // Store in IndexedDB
    const pdfId = await storePDF(blob, null, {
      filename,
      date: data[0]?.days[0]?.date || new Date().toISOString().split('T')[0],
      crewNumber: crewInfo.crewNumber || '',
      fireName: crewInfo.fireName || '',
      fireNumber: crewInfo.fireNumber || ''
    });

    // Handle different output modes
    if (options.downloadImmediately) {
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    // Return data based on options
    if (options.returnBlob) {
      return { blob, filename, pdfId };
    }
    
    return { filename, pdfId };
  } catch (error) {
    console.error('Error filling PDF:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate PDF. Please check your internet connection and try again.');
  }
} 