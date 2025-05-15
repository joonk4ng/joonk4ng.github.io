import { CrewMember, CrewInfo } from '../types/CTRTypes';
import * as XLSX from 'xlsx';

// Define the expected cell locations in the Excel template
export const EXCEL_CELL_MAPPING = {
  crewInfo: {
    crewName: 'B1',
    crewNumber: 'H1',
    fireName: 'C2',
    fireNumber: 'H2'
  },
  dates: {
    date1: 'F4',
    date2: 'H4'
  },
  crewMembers: {
    startRow: 6, // Excel row 6 is where crew member data starts
    columns: {
      name: 'B',
      classification: 'D',
      on1: 'E',
      off1: 'F',
      on2: 'G',
      off2: 'H'
    }
  }
};

function getMergedCellValue(worksheet: XLSX.WorkSheet, cellAddress: string): any {
  // Check if the cell has a value
  if (worksheet[cellAddress] && worksheet[cellAddress].v !== undefined) {
    return worksheet[cellAddress].v;
  }
  // Check for merges
  const merges = worksheet['!merges'] || [];
  const XLSXUtils = XLSX.utils.decode_cell;
  const target = XLSXUtils(cellAddress);

  for (const merge of merges) {
    // Check if the cell is within this merge range
    if (
      target.r >= merge.s.r && target.r <= merge.e.r &&
      target.c >= merge.s.c && target.c <= merge.e.c
    ) {
      // Get the top-left cell of the merge
      const topLeft = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
      return worksheet[topLeft]?.v ?? '';
    }
  }
  return '';
}

export function mapExcelToData(worksheet: XLSX.WorkSheet): { crewInfo: CrewInfo; crewMembers: CrewMember[] } {
  // Extract crew info from specific cells
  const crewInfo: CrewInfo = {
    crewName: getMergedCellValue(worksheet, EXCEL_CELL_MAPPING.crewInfo.crewName) || '',
    crewNumber: getMergedCellValue(worksheet, EXCEL_CELL_MAPPING.crewInfo.crewNumber) || '',
    fireName: getMergedCellValue(worksheet, EXCEL_CELL_MAPPING.crewInfo.fireName) || '',
    fireNumber: getMergedCellValue(worksheet, EXCEL_CELL_MAPPING.crewInfo.fireNumber) || ''
  };

  // Extract dates from specific cells
  const date1 = getMergedCellValue(worksheet, EXCEL_CELL_MAPPING.dates.date1) || '';
  const date2 = getMergedCellValue(worksheet, EXCEL_CELL_MAPPING.dates.date2) || '';

  const crewMembers: CrewMember[] = [];
  let row = EXCEL_CELL_MAPPING.crewMembers.startRow;
  
  // Read up to 20 crew members (rows 6-25)
  while (row <= 25) {
    // Get the name cell for this row
    const nameCell = worksheet[`${EXCEL_CELL_MAPPING.crewMembers.columns.name}${row}`];
    
    // If no name is found in the expected cell, stop reading
    if (!nameCell?.v) break;

    // Create crew member object with data from specific cells
    const crewMember: CrewMember = {
      name: getMergedCellValue(worksheet, `${EXCEL_CELL_MAPPING.crewMembers.columns.name}${row}`),
      classification: getMergedCellValue(worksheet, `${EXCEL_CELL_MAPPING.crewMembers.columns.classification}${row}`),
      days: [
        {
          date: date1,
          on: getMergedCellValue(worksheet, `${EXCEL_CELL_MAPPING.crewMembers.columns.on1}${row}`),
          off: getMergedCellValue(worksheet, `${EXCEL_CELL_MAPPING.crewMembers.columns.off1}${row}`)
        },
        {
          date: date2,
          on: getMergedCellValue(worksheet, `${EXCEL_CELL_MAPPING.crewMembers.columns.on2}${row}`),
          off: getMergedCellValue(worksheet, `${EXCEL_CELL_MAPPING.crewMembers.columns.off2}${row}`)
        }
      ]
    };

    crewMembers.push(crewMember);
    row++;
  }

  return { crewInfo, crewMembers };
}

export function mapDataToExcel(data: { crewInfo: CrewInfo; crewMembers: CrewMember[] }): XLSX.WorkSheet {
  const worksheet: XLSX.WorkSheet = {};

  // Set crew info in specific cells
  worksheet[EXCEL_CELL_MAPPING.crewInfo.crewName] = { t: 's', v: data.crewInfo.crewName };
  worksheet[EXCEL_CELL_MAPPING.crewInfo.crewNumber] = { t: 's', v: data.crewInfo.crewNumber };
  worksheet[EXCEL_CELL_MAPPING.crewInfo.fireName] = { t: 's', v: data.crewInfo.fireName };
  worksheet[EXCEL_CELL_MAPPING.crewInfo.fireNumber] = { t: 's', v: data.crewInfo.fireNumber };

  // Set dates in specific cells
  if (data.crewMembers[0]?.days[0]) {
    worksheet[EXCEL_CELL_MAPPING.dates.date1] = { t: 's', v: data.crewMembers[0].days[0].date };
  }
  if (data.crewMembers[0]?.days[1]) {
    worksheet[EXCEL_CELL_MAPPING.dates.date2] = { t: 's', v: data.crewMembers[0].days[1].date };
  }

  // Set crew member data in specific cells
  data.crewMembers.forEach((member, index) => {
    const row = EXCEL_CELL_MAPPING.crewMembers.startRow + index;
    
    // Set name and classification
    worksheet[`${EXCEL_CELL_MAPPING.crewMembers.columns.name}${row}`] = { t: 's', v: member.name };
    worksheet[`${EXCEL_CELL_MAPPING.crewMembers.columns.classification}${row}`] = { t: 's', v: member.classification };
    
    // Set first day's times
    if (member.days[0]) {
      worksheet[`${EXCEL_CELL_MAPPING.crewMembers.columns.on1}${row}`] = { t: 's', v: member.days[0].on };
      worksheet[`${EXCEL_CELL_MAPPING.crewMembers.columns.off1}${row}`] = { t: 's', v: member.days[0].off };
    }
    
    // Set second day's times
    if (member.days[1]) {
      worksheet[`${EXCEL_CELL_MAPPING.crewMembers.columns.on2}${row}`] = { t: 's', v: member.days[1].on };
      worksheet[`${EXCEL_CELL_MAPPING.crewMembers.columns.off2}${row}`] = { t: 's', v: member.days[1].off };
    }
  });

  return worksheet;
} 