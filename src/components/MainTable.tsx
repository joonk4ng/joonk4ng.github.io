import React, { useEffect, useState } from 'react';
import { defaultData } from '../data/defaultData';
import './MainTable.css';
import { fillCTRPDF } from '../utils/fillCTRPDF';
import * as XLSX from 'xlsx';
import { fillExcelTemplate } from '../utils/fillExcelTemplate';
import { generateExportFilename } from '../utils/filenameGenerator';
import { ctrDataService } from '../utils/CTRDataService';
import { Notification } from './Notification';
import { mapExcelToData } from '../utils/excelMapping';
import { CrewMember, CrewInfo, Day } from '../types/CTRTypes';
import { calculateTotalHours } from '../utils/timeCalculations';
import { DateCalendar } from './DateCalendar';
import StoredPDFs from './StoredPDFs';

// TypeScript interfaces
interface EditingCell {
  row: number;
  field: string;
  dayIdx?: number;
}

interface NotificationState {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  show: boolean;
}

const STORAGE_KEY = 'ctr-table-data';

function saveData(data: CrewMember[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData(): CrewMember[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return defaultData;
    }
  }
  return defaultData;
}

function toExcelTemplate(data: CrewMember[], crewInfo: CrewInfo, days: string[]): XLSX.WorkBook {
  // Create a blank worksheet with enough rows/cols
  const ws: XLSX.WorkSheet = {};
  // Set up the data array for AoA
  const aoa: any[][] = Array.from({ length: 30 }, () => Array(9).fill(""));

  // Header info
  aoa[0][1] = crewInfo.crewName || ""; // B1
  aoa[0][7] = crewInfo.crewNumber || ""; // H1
  aoa[1][1] = crewInfo.fireName || ""; // B2
  aoa[1][7] = crewInfo.fireNumber || ""; // H2

  // Date headers
  aoa[3][5] = days[0] || ""; // F4
  aoa[3][7] = days[1] || ""; // H4

  // Yellow highlight row (row 6, E-H)
  for (let col = 4; col <= 7; col++) aoa[5][col] = "";

  // Table rows (6-25)
  for (let i = 0; i < 20; i++) {
    const row = data[i] || { name: "", classification: "", days: [{ on: "", off: "" }, { on: "", off: "" }] };
    const r = 5 + i; // Excel row 6 is index 5
    aoa[r][1] = row.name || ""; // B
    aoa[r][2] = ""; // C (merged with B)
    aoa[r][3] = row.classification || ""; // D
    aoa[r][4] = row.days[0]?.on || ""; // E (date 1 ON)
    aoa[r][5] = row.days[0]?.off || ""; // F (date 1 OFF)
    aoa[r][6] = row.days[1]?.on || ""; // G (date 2 ON)
    aoa[r][7] = row.days[1]?.off || ""; // H (date 2 OFF)
  }

  // Calculate total hours
  const totalHours = calculateTotalHours(data);

  // Total Hours row (row 29)
  aoa[28][1] = "Total Hours";
  aoa[28][2] = totalHours;

  // Write AoA to worksheet
  XLSX.utils.sheet_add_aoa(ws, aoa);

  // Merge B & C for names
  for (let r = 6; r <= 25; r++) {
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: r - 1, c: 1 }, e: { r: r - 1, c: 2 } });
  }

  // Set column widths
  ws['!cols'] = [
    { wpx: 10 },   // A
    { wpx: 120 },  // B (Name)
    { wpx: 120 },  // C (Name merged)
    { wpx: 60 },   // D (Class)
    { wpx: 50 },   // E (ON 1)
    { wpx: 50 },   // F (OFF 1)
    { wpx: 50 },   // G (ON 2)
    { wpx: 50 },   // H (OFF 2)
  ];

  // Highlight row 6, E-H (yellow)
  for (let c = 4; c <= 7; c++) {
    const cell = XLSX.utils.encode_cell({ r: 5, c });
    if (!ws[cell]) ws[cell] = { t: 's', v: '' };
    ws[cell].s = { fill: { fgColor: { rgb: 'FFFF00' } } };
  }

  // Set time format for ON/OFF cells
  for (let r = 6; r <= 25; r++) {
    for (let c of [4, 5, 6, 7]) {
      const cell = XLSX.utils.encode_cell({ r: r - 1, c });
      if (ws[cell]) ws[cell].z = 'h:mm';
    }
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Crew Time Report");
  return wb;
}

// Add deep comparison utility
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

export default function MainTable() {
  const [data, setData] = useState<CrewMember[]>(() => {
    const loadedData = loadData();
    return Array.isArray(loadedData) ? loadedData : defaultData;
  });
  
  const [dayCount, setDayCount] = useState(() => {
    return data[0]?.days?.length || 2;
  });
  
  const [days, setDays] = useState<string[]>(() => {
    const loadedDates = data[0]?.days?.map(d => d.date);
    return Array.isArray(loadedDates) && loadedDates.length === 2 ? loadedDates : ['', ''];
  });
  const [showSaveDefault, setShowSaveDefault] = useState(false);
  const [crewInfo, setCrewInfo] = useState<CrewInfo>({
    crewName: '',
    crewNumber: '',
    fireName: '',
    fireNumber: ''
  });
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [lastTap, setLastTap] = useState<number>(0);
  const [savedDates, setSavedDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({
    message: '',
    type: 'info',
    show: false
  });

  // Add state to track last saved version
  const [lastSavedState, setLastSavedState] = useState({
    data: data,
    crewInfo: crewInfo,
    days: days
  });

  const [currentDateIndex, setCurrentDateIndex] = useState<number>(-1);

  // Calculate total hours whenever data changes
  const totalHours = calculateTotalHours(data);

  // Add state to track last saved version
  const [lastSavedTotalHours, setLastSavedTotalHours] = useState(0);

  // Add state to track last saved crew info
  const [lastSavedCrewInfo, setLastSavedCrewInfo] = useState<CrewInfo>({
    crewName: '',
    crewNumber: '',
    fireName: '',
    fireNumber: ''
  });

  const [showCalendar, setShowCalendar] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<number | null>(null);

  // Load saved dates on component mount
  useEffect(() => {
    loadSavedDates();
  }, []);

  // Update lastSavedState when data is loaded
  useEffect(() => {
    setLastSavedState({
      data: [...data],
      crewInfo: { ...crewInfo },
      days: [...days]
    });
  }, []);

  // Update lastSavedTotalHours when data is loaded
  useEffect(() => {
    setLastSavedTotalHours(totalHours);
  }, []);

  // Replace the existing useEffect for change tracking
  useEffect(() => {
    // Check if we have all required crew info
    const hasCrewInfo = Boolean(
      crewInfo.crewName && 
      crewInfo.crewNumber && 
      crewInfo.fireName && 
      crewInfo.fireNumber
    );

    // Check if we have both dates
    const hasDates = Boolean(days[0] && days[1]);

    // Check if total hours have changed
    const hoursChanged = Math.abs(totalHours - lastSavedTotalHours) > 0.01;

    // Check if crew info has changed
    const crewInfoChanged = Boolean(
      crewInfo.crewName !== lastSavedCrewInfo.crewName ||
      crewInfo.crewNumber !== lastSavedCrewInfo.crewNumber ||
      crewInfo.fireName !== lastSavedCrewInfo.fireName ||
      crewInfo.fireNumber !== lastSavedCrewInfo.fireNumber
    );

    // Only set hasUnsavedChanges if we have required fields and either hours or crew info changed
    const hasChanges = Boolean(
      (hoursChanged || crewInfoChanged) && 
      hasCrewInfo && 
      hasDates
    );

    setHasUnsavedChanges(hasChanges);
  }, [totalHours, crewInfo, days, lastSavedTotalHours, lastSavedCrewInfo]);

  const loadSavedDates = async () => {
    try {
      const dateRanges = await ctrDataService.getAllDateRanges();
      setSavedDates(dateRanges);
    } catch (error) {
      console.error('Error loading saved dates:', error);
    }
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' | 'error') => {
    setNotification({ message, type, show: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  const handleSave = async () => {
    if (!days[0] || !days[1]) {
      showNotification('Please select both dates before saving.', 'warning');
      return;
    }
    try {
      const date1 = days[0];
      const date2 = days[1];
      await ctrDataService.saveRecord(date1, date2, data, crewInfo);
      await loadSavedDates();
      
      // Update lastSavedTotalHours and lastSavedCrewInfo after successful save
      setLastSavedTotalHours(totalHours);
      setLastSavedCrewInfo({ ...crewInfo });
      
      setHasUnsavedChanges(false);
      showNotification('Data saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving data:', error);
      showNotification('Failed to save data. Please try again.', 'error');
    }
  };

  const findCurrentDateIndex = () => {
    if (!selectedDate) return -1;
    return savedDates.findIndex(date => date === selectedDate);
  };

  const handlePreviousEntry = async () => {
    const currentIndex = findCurrentDateIndex();
    if (currentIndex > 0) {
      const prevDateRange = savedDates[currentIndex - 1];
      // Reset unsaved changes state before loading new data
      setHasUnsavedChanges(false);
      await handleDateSelect(prevDateRange);
    }
  };

  const handleNextEntry = async () => {
    const currentIndex = findCurrentDateIndex();
    if (currentIndex < savedDates.length - 1) {
      const nextDateRange = savedDates[currentIndex + 1];
      // Reset unsaved changes state before loading new data
      setHasUnsavedChanges(false);
      await handleDateSelect(nextDateRange);
    }
  };

  const handleDateSelect = async (dateRange: string) => {
    if (dateRange === "new") {
      if (hasUnsavedChanges) {
        showNotification('You have unsaved changes. Please save or discard them before starting a new entry.', 'warning');
        return;
      }
      setData(defaultData);
      setCrewInfo({
        crewName: '',
        crewNumber: '',
        fireName: '',
        fireNumber: ''
      });
      setDays(['', '']);
      setSelectedDate('');
      setCurrentDateIndex(-1);
      setHasUnsavedChanges(false);
      setLastSavedTotalHours(0);
      setLastSavedCrewInfo({
        crewName: '',
        crewNumber: '',
        fireName: '',
        fireNumber: ''
      });
      showNotification('New entry started', 'info');
      return;
    }

    if (hasUnsavedChanges) {
      showNotification('You have unsaved changes. Please save or discard them before loading another date range.', 'warning');
      return;
    }

    try {
      const record = await ctrDataService.getRecord(dateRange);
      if (record) {
        setData(record.data);
        setCrewInfo(record.crewInfo);
        const [date1, date2] = record.dateRange.split(' to ');
        setDays([date1, date2]);
        setSelectedDate(dateRange);
        setCurrentDateIndex(savedDates.indexOf(dateRange));
        setHasUnsavedChanges(false);
        
        // Update lastSavedTotalHours and lastSavedCrewInfo with the loaded data
        const loadedTotalHours = calculateTotalHours(record.data);
        setLastSavedTotalHours(loadedTotalHours);
        setLastSavedCrewInfo({ ...record.crewInfo });
        
        showNotification('Data loaded successfully', 'success');
      }
    } catch (error) {
      console.error('Error loading selected date range:', error);
      showNotification('Failed to load data. Please try again.', 'error');
    }
  };

  useEffect(() => {
    saveData(data);
  }, [data]);

  const handleCellDoubleTap = (rowIdx: number, field: string, dayIdx?: number) => {
    const now = Date.now();
    if (now - lastTap < 300) { // Double tap detected
      setEditingCell({ row: rowIdx, field, dayIdx });
    }
    setLastTap(now);
  };

  const handleCellDoubleClick = (rowIdx: number, field: string, dayIdx?: number) => {
    setEditingCell({ row: rowIdx, field, dayIdx });
  };

  const validateMilitaryTime = (value: string): boolean => {
    if (!value) return true;
    
    // Must be exactly 4 digits
    if (value.length > 4) return false;
    
    // Convert to array of digits
    const digits = value.split('').map(Number);
    
    // First digit must be 0-2
    if (digits[0] > 2) return false;
    
    // Second digit rules based on first digit
    if (digits[0] === 2 && digits[1] > 3) return false;
    
    // Third digit must be 0-5
    if (digits[2] > 5) return false;
    
    return true;
  };

  const copyFFTTimes = () => {
    // Find the first FFT1 or FFT2 entry
    const fftIndex = data.findIndex(member => 
      member.classification?.toUpperCase().includes('FFT1') || 
      member.classification?.toUpperCase().includes('FFT2')
    );

    if (fftIndex === -1) {
      alert('Please enter an FFT1 or FFT2 classification first.');
      return;
    }

    if (!data[fftIndex].name) {
      alert('Please enter the FFT name first.');
      return;
    }

    const fftTimes = data[fftIndex].days;
    const newData = data.map((member, index) => {
      if (index <= fftIndex) return member; // Skip crew boss and FFT
      return {
        ...member,
        days: fftTimes.map(day => ({ ...day }))
      };
    });

    setData(newData);
    setHasUnsavedChanges(true);
  };

  const handleCellEdit = (e: React.ChangeEvent<HTMLInputElement>, rowIdx: number, field: string, dayIdx?: number) => {
    const { value } = e.target;
    
    // Validate military time for on/off fields
    if ((field === 'on' || field === 'off')) {
      // Only allow digits
      if (!/^\d*$/.test(value)) return;
      
      // Apply validation rules
      if (!validateMilitaryTime(value)) return;
    }

    const newData = [...data];
    
    // Ensure the row exists and has the required structure
    if (!newData[rowIdx]) {
      newData[rowIdx] = {
        name: '',
        classification: '',
        days: days.map(date => ({ date, on: '', off: '' }))
      };
    }
    
    // Ensure days array exists
    if (!newData[rowIdx].days) {
      newData[rowIdx].days = days.map(date => ({ date, on: '', off: '' }));
    }
    
    if (dayIdx !== undefined) {
      // Ensure the day object exists
      if (!newData[rowIdx].days[dayIdx]) {
        newData[rowIdx].days[dayIdx] = { date: days[dayIdx] || '', on: '', off: '' };
      }
      newData[rowIdx].days[dayIdx][field as keyof Day] = value;

      // If this is the second row (index 1) and we're editing ON/OFF times
      if (rowIdx === 1) {
        // Copy these times to all subsequent rows that have names
        for (let i = 2; i < newData.length; i++) {
          if (newData[i]?.name) {
            if (!newData[i].days[dayIdx]) {
              newData[i].days[dayIdx] = { date: days[dayIdx] || '', on: '', off: '' };
            }
            newData[i].days[dayIdx][field as keyof Day] = value;
          }
        }
      }
    } else {
      (newData[rowIdx] as any)[field] = value;

      // If this is a name field and it's not the first FFT1/FFT2, copy their times
      if (field === 'name' && value) {
        const fftIndex = newData.findIndex(member => 
          member?.classification?.toUpperCase().includes('FFT1') || 
          member?.classification?.toUpperCase().includes('FFT2')
        );

        if (fftIndex !== -1 && rowIdx > fftIndex && newData[fftIndex]?.days) {
          const fftTimes = newData[fftIndex].days;
          newData[rowIdx].days = fftTimes.map(day => ({ ...day }));
        }
      }
    }
    
    setData(newData);
    setHasUnsavedChanges(true);
  };

  const handleCellBlur = () => {
    setTimeout(() => {
      setEditingCell(null);
    }, 200);
  };

  const handleDelete = (idx: number) => {
    const newData = data.filter((_, i) => i !== idx);
    setData(newData);
  };

  const handleHeaderDateChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const newDate = e.target.value;
    setDays(prev => prev.map((d, i) => (i === idx ? newDate : d)));
    setData(data => data.map(row => ({
      ...row,
      days: row.days.map((day, i) => i === idx ? { ...day, date: newDate } : day)
    })));
    setHasUnsavedChanges(true);
  };

  const handleResetToDefault = () => {
    setData(defaultData);
    saveData(defaultData);
    setShowSaveDefault(false);
    showNotification('Restored to original default data!', 'info');
  };

  const handleSaveDefault = () => {
    saveData(data);
    setShowSaveDefault(false);
    showNotification('Current table saved as default!', 'success');
  };

  const handleExportExcel = async () => {
    try {
      // Validate required data before attempting Excel generation
      if (!days[0] || !days[1]) {
        showNotification('Please select both dates before generating Excel.', 'warning');
        return;
      }

      if (!crewInfo.crewNumber || !crewInfo.fireName || !crewInfo.fireNumber) {
        showNotification('Please fill in all crew and fire information before generating Excel.', 'warning');
        return;
      }

      // Check if there's any crew member data
      const hasCrewData = data.some(member => 
        member.name && member.classification && 
        member.days.some(day => day.on || day.off)
      );

      if (!hasCrewData) {
        showNotification('Please enter at least one crew member\'s information before generating Excel.', 'warning');
        return;
      }

      showNotification('Generating Excel...', 'info');
      
      const wb = await fillExcelTemplate(data, crewInfo, days, '/CTR_Template.xlsx');
      XLSX.writeFile(wb, generateExportFilename({
        date: days[0],
        crewNumber: crewInfo.crewNumber,
        fireName: crewInfo.fireName,
        fireNumber: crewInfo.fireNumber,
        type: 'Excel'
      }));
      showNotification('Excel file generated successfully!', 'success');
    } catch (error) {
      console.error('Error generating Excel:', error);
      let errorMessage = 'Failed to generate Excel file. ';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage += 'Please check your internet connection and try again.';
        } else if (error.message.includes('template')) {
          errorMessage += 'The Excel template could not be loaded. Please try refreshing the page.';
        } else {
          errorMessage += 'An unexpected error occurred. Please try again.';
        }
      }
      
      showNotification(errorMessage, 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      // Validate required data before attempting PDF generation
      if (!days[0] || !days[1]) {
        showNotification('Please select both dates before generating PDF.', 'warning');
        return;
      }

      if (!crewInfo.crewNumber || !crewInfo.fireName || !crewInfo.fireNumber) {
        showNotification('Please fill in all crew and fire information before generating PDF.', 'warning');
        return;
      }

      // Check if there's any crew member data
      const hasCrewData = data.some(member => 
        member.name && member.classification && 
        member.days.some(day => day.on || day.off)
      );

      if (!hasCrewData) {
        showNotification('Please enter at least one crew member\'s information before generating PDF.', 'warning');
        return;
      }

      showNotification('Generating PDF...', 'info');
      
      try {
        await fillCTRPDF(data, crewInfo, undefined);
        showNotification('PDF generated successfully!', 'success');
      } catch (error) {
        // error handling
        console.error('Error generating PDF:', error);
        let errorMessage = 'Failed to generate PDF. ';
        
        if (error instanceof Error) {
          if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage += 'Please check your internet connection and try again.';
          } else if (error.message.includes('cache')) {
            errorMessage += 'The PDF template could not be loaded. Please try refreshing the page.';
          } else {
            errorMessage += 'An unexpected error occurred. Please try again.';
          }
        }
        
        showNotification(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error in PDF generation process:', error);
      showNotification('An unexpected error occurred while preparing the PDF.', 'error');
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Use the mapping utility to extract data
        const { crewInfo: importedCrewInfo, crewMembers } = mapExcelToData(worksheet);
        
        // Update the application state
        setCrewInfo(importedCrewInfo);
        setData(crewMembers);
        
        // Extract dates from the first crew member's days
        if (crewMembers.length > 0) {
          const dates = crewMembers[0].days.map(d => d.date);
          setDays(dates);
          setDayCount(dates.length);
        }
        
        setShowSaveDefault(true);
        showNotification('Excel file imported successfully', 'success');
      } catch (error) {
        console.error('Error importing Excel file:', error);
        showNotification('Error importing Excel file. Please check the file format.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCopyToNextDay = async () => {
    if (!days[0] || !days[1]) {
      showNotification('Please set both dates before copying to next days.', 'warning');
      return;
    }

    // Validate that we have crew data
    const hasCrewData = data.some(member => 
      member.name && member.classification
    );

    if (!hasCrewData) {
      showNotification('Please enter crew information before copying to next days.', 'warning');
      return;
    }

    try {
      showNotification('Copying data to next 20 days...', 'info');
      
      // Get the base dates
      const startDate = new Date(days[0]);
      const endDate = new Date(days[1]);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Copy data for next 20 days
      for (let i = 0; i < 20; i++) {
        // Calculate new date range starting from the day after date2
        const newStartDate = new Date(endDate);
        newStartDate.setDate(newStartDate.getDate() + 1 + (i * (daysDiff + 1)));
        
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + daysDiff);

        const newStartDateStr = newStartDate.toISOString().split('T')[0];
        const newEndDateStr = newEndDate.toISOString().split('T')[0];

        // Create new data with updated dates but empty time entries
        const newData = data.map(member => ({
          name: member.name,
          classification: member.classification,
          days: [
            { date: newStartDateStr, on: '', off: '' },
            { date: newEndDateStr, on: '', off: '' }
          ]
        }));

        // Save the new date range
        await ctrDataService.saveRecord(newStartDateStr, newEndDateStr, newData, crewInfo);
      }

      // Reload saved dates
      await loadSavedDates();
      setCurrentDateIndex(findCurrentDateIndex());
      showNotification('Successfully copied crew information to next 20 days!', 'success');
    } catch (error) {
      console.error('Error copying data to next days:', error);
      showNotification('Failed to copy data to next days. Please try again.', 'error');
    }
  };

  const handleRemoveEntry = async () => {
    if (!selectedDate) {
      showNotification('Please select a date range to remove.', 'warning');
      return;
    }

    if (hasUnsavedChanges) {
      showNotification('Please save or discard your changes before removing an entry.', 'warning');
      return;
    }

    try {
      await ctrDataService.deleteRecord(selectedDate);
      await loadSavedDates();
      setSelectedDate('');
      setCurrentDateIndex(-1);
      setData(defaultData);
      setCrewInfo({
        crewName: '',
        crewNumber: '',
        fireName: '',
        fireNumber: ''
      });
      setDays(['', '']);
      showNotification('Entry removed successfully', 'success');
    } catch (error) {
      console.error('Error removing entry:', error);
      showNotification('Failed to remove entry. Please try again.', 'error');
    }
  };

  return (
    <div className="ctr-container">
      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}
      <h2 className="ctr-title">Crew Time Report Table</h2>
      
      {/* Date Selection and Save Controls */}
      <div className="ctr-date-controls">
        <div className="ctr-date-selector">
          <select 
            value={selectedDate}
            onChange={(e) => handleDateSelect(e.target.value)}
            className="ctr-select"
          >
            <option value="new">New Entry</option>
            <option value="">Select a saved date range...</option>
            {savedDates.map(dateRange => {
              const [date1, date2] = dateRange.split(' to ');
              return (
                <option key={dateRange} value={dateRange}>
                  {date1} to {date2}
                </option>
              );
            })}
          </select>
          <button 
            className="ctr-btn calendar-btn"
            onClick={() => setShowCalendar(true)}
            title="Open Calendar View"
          >
            📅
          </button>
        </div>
        <div className="ctr-navigation-buttons">
          <button 
            className="ctr-btn nav-btn" 
            onClick={handlePreviousEntry}
            disabled={currentDateIndex <= 0}
          >
            ← Previous
          </button>
          <button 
            className="ctr-btn nav-btn" 
            onClick={handleNextEntry}
            disabled={currentDateIndex >= savedDates.length - 1}
          >
            Next →
          </button>
        </div>
        <button 
          className="ctr-btn copy-btn" 
          onClick={handleCopyToNextDay}
          disabled={!days[1]}
        >
          Copy to Next 20 Days
        </button>
        <button 
          className="ctr-btn save-btn" 
          onClick={handleSave}
          disabled={!hasUnsavedChanges || !days[0] || !days[1]}
        >
          {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
        </button>
      </div>

      <div className="ctr-crew-info-form">
        <input
          className="ctr-input"
          placeholder="Crew Name"
          value={crewInfo.crewName}
          onChange={e => setCrewInfo({ ...crewInfo, crewName: e.target.value })}
        />
        <input
          className="ctr-input"
          placeholder="Crew Number"
          value={crewInfo.crewNumber}
          onChange={e => setCrewInfo({ ...crewInfo, crewNumber: e.target.value })}
        />
        <input
          className="ctr-input"
          placeholder="Fire Name"
          value={crewInfo.fireName}
          onChange={e => setCrewInfo({ ...crewInfo, fireName: e.target.value })}
        />
        <input
          className="ctr-input"
          placeholder="Fire Number"
          value={crewInfo.fireNumber}
          onChange={e => setCrewInfo({ ...crewInfo, fireNumber: e.target.value })}
        />
      </div>
      <div className="ctr-actions">
        <input type="file" accept=".xlsx" onChange={handleExcelUpload} />
        <button className="ctr-btn" onClick={handleExportExcel}>Export Excel</button>
        <button className="ctr-btn" onClick={handleExportPDF}>Export to PDF</button>
        {showSaveDefault && (
          <button className="ctr-btn" onClick={handleSaveDefault} style={{ background: '#388e3c' }}>Save as Default</button>
        )}
        <button className="ctr-btn" onClick={handleResetToDefault} style={{ background: '#888' }}>Reset to Default</button>
        <button 
          className="ctr-btn" 
          onClick={handleRemoveEntry}
          disabled={!selectedDate}
          style={{ background: '#d32f2f' }}
        >
          Remove Entry
        </button>
      </div>
      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <table className="ctr-table">
          <thead>
            <tr>
              <th className="ctr-th name" rowSpan={2}>NAME</th>
              <th className="ctr-th class" rowSpan={2}>CLASS</th>
              {days.map((date, i) => (
                <th className="ctr-th date" colSpan={2} key={i} style={{ textAlign: 'center' }}>
                  DATE<br />
                  <input
                    className="ctr-input ctr-date"
                    type="date"
                    value={date}
                    onChange={e => handleHeaderDateChange(e, i)}
                    style={{ fontWeight: 'bold', fontSize: 14, textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '1.5px solid #d32f2f' }}
                  />
                </th>
              ))}
              <th className="ctr-th" rowSpan={2}></th>
            </tr>
            <tr>
              {days.map((_, i) => (
                <React.Fragment key={i}>
                  <th className="ctr-th">ON</th>
                  <th className="ctr-th">OFF</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 20 }).map((_, idx) => {
              const row = data[idx] || {
                name: '',
                classification: '',
                days: days.map(date => ({ date, on: '', off: '' }))
              };
              
              return (
                <tr key={idx} className="ctr-tr">
                  <td className="ctr-td">
                    {editingCell?.row === idx && editingCell?.field === 'name' ? (
                      <input
                        className="ctr-input"
                        value={row.name || ''}
                        onChange={e => handleCellEdit(e, idx, 'name')}
                        onBlur={handleCellBlur}
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="ctr-cell-content"
                        onDoubleClick={() => handleCellDoubleClick(idx, 'name')}
                        onTouchStart={() => handleCellDoubleTap(idx, 'name')}
                      >
                        {row.name || ''}
                      </div>
                    )}
                  </td>
                  <td className="ctr-td">
                    {editingCell?.row === idx && editingCell?.field === 'classification' ? (
                      <input
                        className="ctr-input"
                        value={row.classification}
                        onChange={e => handleCellEdit(e, idx, 'classification')}
                        onBlur={handleCellBlur}
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="ctr-cell-content"
                        onDoubleClick={() => handleCellDoubleClick(idx, 'classification')}
                        onTouchStart={() => handleCellDoubleTap(idx, 'classification')}
                      >
                        {row.classification}
                      </div>
                    )}
                  </td>
                  {row.days.map((day, dayIdx) => (
                    <React.Fragment key={dayIdx}>
                      <td className="ctr-td">
                        {editingCell?.row === idx && editingCell?.field === 'on' && editingCell?.dayIdx === dayIdx ? (
                          <input
                            className="ctr-input ctr-on"
                            value={day.on}
                            onChange={e => handleCellEdit(e, idx, 'on', dayIdx)}
                            onBlur={handleCellBlur}
                            autoFocus
                            placeholder="HHMM"
                            maxLength={4}
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        ) : (
                          <div 
                            className="ctr-cell-content"
                            onDoubleClick={() => handleCellDoubleClick(idx, 'on', dayIdx)}
                            onTouchStart={() => handleCellDoubleTap(idx, 'on', dayIdx)}
                          >
                            {day.on}
                          </div>
                        )}
                      </td>
                      <td className="ctr-td">
                        {editingCell?.row === idx && editingCell?.field === 'off' && editingCell?.dayIdx === dayIdx ? (
                          <input
                            className="ctr-input ctr-off"
                            value={day.off}
                            onChange={e => handleCellEdit(e, idx, 'off', dayIdx)}
                            onBlur={handleCellBlur}
                            autoFocus
                            placeholder="HHMM"
                            maxLength={4}
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        ) : (
                          <div 
                            className="ctr-cell-content"
                            onDoubleClick={() => handleCellDoubleClick(idx, 'off', dayIdx)}
                            onTouchStart={() => handleCellDoubleTap(idx, 'off', dayIdx)}
                          >
                            {day.off}
                          </div>
                        )}
                      </td>
                    </React.Fragment>
                  ))}
                  <td className="ctr-td">
                    {data[idx] && (
                      <button 
                        className="ctr-btn" 
                        style={{ background: '#d32f2f', padding: '2px 6px' }} 
                        onClick={() => handleDelete(idx)}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Total Hours Display */}
      <div className="ctr-total-hours">
        <div className="ctr-total-label">Total Hours Worked:</div>
        <div className="ctr-total-value">{totalHours.toFixed(2)}</div>
      </div>

      {showCalendar && (
        <DateCalendar
          savedDates={savedDates}
          onDateSelect={handleDateSelect}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {showCustomDatePicker !== null && (
        <div className="custom-date-picker">
          <input
            type="date"
            value={days[showCustomDatePicker]}
            onChange={(e) => {
              const newDate = e.target.value;
              setDays(prev => prev.map((d, i) => (i === showCustomDatePicker ? newDate : d)));
              setData(data => data.map(row => ({
                ...row,
                days: row.days.map((day, i) => i === showCustomDatePicker ? { ...day, date: newDate } : day)
              })));
              setHasUnsavedChanges(true);
              setShowCustomDatePicker(null);
            }}
            onBlur={() => setShowCustomDatePicker(null)}
            autoFocus
          />
        </div>
      )}

      {/* Add StoredPDFs component */}
      <StoredPDFs />
    </div>
  );
}

// Add these styles to MainTable.css
const styles = `
.ctr-date-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 1rem;
}

.ctr-select {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-width: 200px;
  background-color: white;
}

.ctr-select:focus {
  outline: none;
  border-color: #d32f2f;
}

.calendar-btn {
  padding: 0.5rem;
  font-size: 1.2rem;
  background: none;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.calendar-btn:hover {
  background-color: #f5f5f5;
  border-color: #d32f2f;
}

.ctr-signature-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.ctr-signature-display {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.ctr-signature-content {
  flex: 1;
}

.ctr-signature-label {
  color: #666;
  font-weight: bold;
  margin-bottom: 8px;
}

.ctr-signature-name {
  color: #333;
  margin-bottom: 12px;
}

.ctr-signature-image {
  max-width: 300px;
  border: 1px solid #ddd;
  background: white;
  padding: 10px;
  border-radius: 4px;
}

.ctr-signature-image img {
  width: 100%;
  height: auto;
}

.signature-btn, .edit-signature-btn {
  background: #1976d2;
  white-space: nowrap;
}

.signature-btn:hover, .edit-signature-btn:hover {
  background: #1565c0;
}

@media (max-width: 768px) {
  .ctr-signature-section {
    padding: 10px;
  }

  .ctr-signature-display {
    flex-direction: column;
    gap: 10px;
  }

  .ctr-signature-image {
    max-width: 100%;
  }
}

.custom-date-picker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.custom-date-picker input {
  font-size: 16px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.custom-date-picker input:focus {
  outline: none;
  border-color: #d32f2f;
}
`; 