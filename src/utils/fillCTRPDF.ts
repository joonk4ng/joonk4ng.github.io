import { PDFDocument } from 'pdf-lib';
import { mapToPDFFields } from './pdfFieldMapper';
import { generateExportFilename } from './filenameGenerator';

// Fills the CTR PDF and triggers a download
export async function fillCTRPDF(data: any[], crewInfo: any, pdfUrl = '/CTR_Fillable.pdf') {
  try {
    // Try to fetch from cache first, then network
    const response = await fetch(pdfUrl, {
      cache: 'force-cache' // This will try to use the cached version first
    });
    
    if (!response.ok) {
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

    // Save and trigger download
    const filledPdfBytes = await pdfDoc.save();
    const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateExportFilename({
      date: data[0]?.days[0]?.date || new Date().toISOString().split('T')[0],
      crewNumber: crewInfo.crewNumber || '',
      fireName: crewInfo.fireName || '',
      fireNumber: crewInfo.fireNumber || '',
      type: 'PDF'
    });
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error filling PDF:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate PDF. Please check your internet connection and try again.');
  }
} 