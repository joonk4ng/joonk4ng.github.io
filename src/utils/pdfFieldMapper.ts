// Maps table data to PDF field names as extracted from pdf_fields.csv
export function mapToPDFFields(data: any[], crewInfo?: any, signature?: { name: string; signature: string }) {
  const fields: Record<string, string> = {};
  
  // Crew info fields
  if (crewInfo) {
    fields['1 CREW NAME'] = crewInfo.crewName || '';
    fields['2 CREW NUMER'] = crewInfo.crewNumber || '';
    fields['4FIRE NAME'] = crewInfo.fireName || '';
    fields['5 FIRE NUMBER'] = crewInfo.fireNumber || '';
  }

  // Populate DATE and DATE_2 fields from the first row's days if available
  if (data[0]?.days[0]) {
    fields['DATE'] = data[0].days[0].date;
  }
  if (data[0]?.days[1]) {
    fields['DATE_2'] = data[0].days[1].date;
  }

  // Only map rows that have actual data
  data.forEach((row, idx) => {
    // Skip rows that don't have a name or classification
    if (!row?.name && !row?.classification) return;

    const rowNum = idx + 1;
    
    // Use the exact field names from your CSV
    fields[`NAME OF EMPLOYEERow${rowNum}`] = row.name || '';
    fields[`ClASS IF CATIONRow${rowNum}`] = row.classification || '';

    // Day 1
    if (row.days?.[0]) {
      fields[`ONRow${rowNum}`] = row.days[0].on || '';
      fields[`OFFRow${rowNum}`] = row.days[0].off || '';
    }

    // Day 2
    if (row.days?.[1]) {
      fields[`ONRow${rowNum}_2`] = row.days[1].on || '';
      fields[`OFFRow${rowNum}_2`] = row.days[1].off || '';
    }
  });

  return fields;
} 