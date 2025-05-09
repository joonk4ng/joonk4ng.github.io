import { PDFDocument } from 'pdf-lib';
import { mapToPDFFields } from './pdfFieldMapper';

// Fills the CTR PDF and triggers a download
export async function fillCTRPDF(data: any[], crewInfo: any, pdfUrl = '/CTR_Fillable.pdf') {
  // Fetch the PDF template
  const response = await fetch(pdfUrl);
  const pdfBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const form = pdfDoc.getForm();
  const fields = mapToPDFFields(data, crewInfo);

  // Fill fields
  Object.entries(fields).forEach(([field, value]) => {
    try {
      form.getTextField(field).setText(value);
    } catch (e) {
      // Field might not exist, skip or log
      // console.warn(`Field ${field} not found in PDF`);
    }
  });

  // Save and trigger download
  const filledPdfBytes = await pdfDoc.save();
  const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'CTR_Filled.pdf';
  a.click();
  URL.revokeObjectURL(url);
} 