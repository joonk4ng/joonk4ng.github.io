import * as XLSX from 'xlsx';

interface CrewMember {
  remarkNumber?: string;
  name: string;
  classification: string;
  days: {
    date: string;
    on: string;
    off: string;
  }[];
}

interface CrewInfo {
  crewName: string;
  crewNumber: string;
  fireName: string;
  fireNumber: string;
}

interface TemplateMapping {
  // Header Information
  crewName?: string;      // Cell for crew name
  crewNumber?: string;    // Cell for crew number
  fireName?: string;      // Cell for fire name
  fireNumber?: string;    // Cell for fire number
  date1?: string;         // Cell for first date
  date2?: string;         // Cell for second date

  // Data Start Position
  nameStartRow?: number;  // Starting row for crew member data
  nameCol?: string;       // Column for names
  classCol?: string;      // Column for classifications
  on1Col?: string;        // Column for first day ON times
  off1Col?: string;       // Column for first day OFF times
  on2Col?: string;        // Column for second day ON times
  off2Col?: string;       // Column for second day OFF times

  // Total Hours
  totalHoursRow?: number; // Row for total hours
  totalHoursCol?: string; // Column for total hours
}

// CTR Template Mapping
const CTR_TEMPLATE_MAPPING: TemplateMapping = {
  // Header Information
  crewName: 'A1',         // Crew Name
  crewNumber: 'F1',       // Crew Number
  fireName: 'C2',         // Fire Name
  fireNumber: 'F2',       // Fire Number
  date1: 'F4',           // First Date
  date2: 'H4',           // Second Date

  // Data Start Position
  nameStartRow: 6,        // Start from row 6
  nameCol: 'B',          // Names in column B (B6-B25)
  classCol: 'D',         // Classifications in column D
  on1Col: 'E',           // First day ON times in column E (E6-E25)
  off1Col: 'F',          // First day OFF times in column F (F6-F25)
  on2Col: 'G',           // Second day ON times in column G
  off2Col: 'H',          // Second day OFF times in column H

  // Total Hours
  totalHoursRow: 30,     // Total hours in row 30
  totalHoursCol: 'C'     // Total hours in column C
};

export async function fillExcelTemplate(
  data: any[],
  crewInfo: any,
  days: string[],
  templateUrl = '/CTR_Template.xlsx',
  mapping: TemplateMapping = CTR_TEMPLATE_MAPPING
): Promise<XLSX.WorkBook> {
  try {
    // Validate input data
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    // Fetch the template
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }
    
    const templateData = await response.arrayBuffer();
    const workbook = XLSX.read(templateData, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    // Fill header info
    if (mapping.crewName) {
      worksheet[mapping.crewName] = { t: 's', v: crewInfo?.crewName || '' };
    }
    if (mapping.crewNumber) {
      worksheet[mapping.crewNumber] = { t: 's', v: crewInfo?.crewNumber || '' };
    }
    if (mapping.fireName) {
      worksheet[mapping.fireName] = { t: 's', v: crewInfo?.fireName || '' };
    }
    if (mapping.fireNumber) {
      worksheet[mapping.fireNumber] = { t: 's', v: crewInfo?.fireNumber || '' };
    }

    // Fill dates
    if (mapping.date1) {
      worksheet[mapping.date1] = { t: 's', v: days?.[0] || '' };
    }
    if (mapping.date2) {
      worksheet[mapping.date2] = { t: 's', v: days?.[1] || '' };
    }

    // Fill crew member data
    const startRow = mapping.nameStartRow || 6;
    data.forEach((row, idx) => {
      // Skip if row is undefined or has no data
      if (!row || (!row.name && !row.classification)) return;
      
      const rowNum = startRow + idx;
      if (rowNum > startRow + 19) return; // Don't exceed 20 rows

      // Fill name and classification
      if (mapping.nameCol) {
        worksheet[`${mapping.nameCol}${rowNum}`] = { t: 's', v: row.name || '' };
      }
      if (mapping.classCol) {
        worksheet[`${mapping.classCol}${rowNum}`] = { t: 's', v: row.classification || '' };
      }

      // Fill times for day 1
      if (row.days?.[0]) {
        if (mapping.on1Col) {
          worksheet[`${mapping.on1Col}${rowNum}`] = { t: 's', v: row.days[0].on || '' };
        }
        if (mapping.off1Col) {
          worksheet[`${mapping.off1Col}${rowNum}`] = { t: 's', v: row.days[0].off || '' };
        }
      }

      // Fill times for day 2
      if (row.days?.[1]) {
        if (mapping.on2Col) {
          worksheet[`${mapping.on2Col}${rowNum}`] = { t: 's', v: row.days[1].on || '' };
        }
        if (mapping.off2Col) {
          worksheet[`${mapping.off2Col}${rowNum}`] = { t: 's', v: row.days[1].off || '' };
        }
      }
    });

    // Calculate and fill total hours
    const totalHours = calculateTotalHours(data);
    if (mapping.totalHoursRow && mapping.totalHoursCol) {
      worksheet[`${mapping.totalHoursCol}${mapping.totalHoursRow}`] = { t: 'n', v: totalHours };
    }

    return workbook;
  } catch (error) {
    console.error('Error filling Excel template:', error);
    throw error;
  }
}

function findHeaderCells(worksheet: XLSX.WorkSheet): TemplateMapping {
  const mapping: TemplateMapping = {};
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // Search for header patterns
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell || !cell.v) continue;

      const value = String(cell.v).toLowerCase();
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });

      // Look for header patterns
      if (value.includes('crew') && value.includes('name')) {
        mapping.crewName = cellRef;
      } else if (value.includes('crew') && value.includes('number')) {
        mapping.crewNumber = cellRef;
      } else if (value.includes('fire') && value.includes('name')) {
        mapping.fireName = cellRef;
      } else if (value.includes('fire') && value.includes('number')) {
        mapping.fireNumber = cellRef;
      } else if (value.includes('date') && !mapping.date1) {
        mapping.date1 = cellRef;
      } else if (value.includes('date') && mapping.date1) {
        mapping.date2 = cellRef;
      } else if (value.includes('name') && !mapping.nameCol) {
        mapping.nameCol = XLSX.utils.encode_col(C);
        mapping.nameStartRow = R + 1;
      } else if (value.includes('class') && !mapping.classCol) {
        mapping.classCol = XLSX.utils.encode_col(C);
      } else if (value.includes('on') && !mapping.on1Col) {
        mapping.on1Col = XLSX.utils.encode_col(C);
      } else if (value.includes('off') && !mapping.off1Col) {
        mapping.off1Col = XLSX.utils.encode_col(C);
      } else if (value.includes('total') && value.includes('hours')) {
        mapping.totalHoursRow = R;
        mapping.totalHoursCol = XLSX.utils.encode_col(C + 1); // Assuming total is in next column
      }
    }
  }

  return mapping;
}

function calculateTotalHours(data: CrewMember[]): number {
  if (!Array.isArray(data)) return 0;
  
  let total = 0;
  for (const row of data) {
    if (!row || !row.days || !Array.isArray(row.days)) continue;
    
    for (const day of row.days) {
      if (!day) continue;
      const on = parseMilitaryTime(day.on);
      const off = parseMilitaryTime(day.off);
      if (on !== null && off !== null && off >= on) {
        total += off - on;
      }
    }
  }
  return Number(total.toFixed(2));
}

function parseMilitaryTime(time: string): number | null {
  if (!/^\d{4}$/.test(time)) return null;
  const h = parseInt(time.slice(0, 2), 10);
  const m = parseInt(time.slice(2, 4), 10);
  if (h > 23 || m > 59) return null;
  return h + m / 60;
} 