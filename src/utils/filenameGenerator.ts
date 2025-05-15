interface ExportInfo {
  date: string;
  crewNumber: string;
  fireName: string;
  fireNumber: string;
  type: 'PDF' | 'Excel' | 'CSV';
}

export function generateExportFilename(info: ExportInfo): string {
  const { date, crewNumber, fireName, fireNumber, type } = info;
  
  // Format date to YYYY-MM-DD if it's not already
  const formattedDate = date.includes('-') ? date : new Date(date).toISOString().split('T')[0];
  
  // Clean up the values to be filename-safe
  const safeCrewNumber = crewNumber.replace(/[^a-zA-Z0-9]/g, '');
  const safeFireName = fireName.replace(/[^a-zA-Z0-9]/g, '');
  const safeFireNumber = fireNumber.replace(/[^a-zA-Z0-9]/g, '');
  
  // Generate the filename
  const filename = `${formattedDate} ${safeCrewNumber} ${safeFireName} ${safeFireNumber} ${type} CTR`;
  
  // Add appropriate extension
  switch (type) {
    case 'PDF':
      return `${filename}.pdf`;
    case 'Excel':
      return `${filename}.xlsx`;
    case 'CSV':
      return `${filename}.csv`;
    default:
      return filename;
  }
} 