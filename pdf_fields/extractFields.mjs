import { PDFDocument } from 'pdf-lib';
import https from 'https';
import fs from 'fs';
import path from 'path';

// Fetch PDF as buffer
async function fetchPdfBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function extractFieldNamesToCSV(url, outputCsvPath) {
  const pdfBytes = await fetchPdfBuffer(url);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const fieldNames = fields.map((field) => field.getName());

  const csvContent = fieldNames.join('\n');
  fs.writeFileSync(path.resolve(outputCsvPath), csvContent);
  console.log(`Field names exported to ${outputCsvPath}`);
}

const ctrPdfUrl = 'https://gacc.nifc.gov/gbcc/dispatch/ut-cdc/business/docs/CTR_Fillable_Edited.pdf';
const outputPath = './pdf_fields.csv';

extractFieldNamesToCSV(ctrPdfUrl, outputPath);
