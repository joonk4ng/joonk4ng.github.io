// File containing functions for calculate hours

// CrewMember object with times
interface CrewMember {
  name: string;
  classification: string;
  days: Array<{
    on: string;
    off: string;
  }>;
}

// Declare function and export
export function calculateTotalHours(data: CrewMember[]): number {
  // initialize to totalHours to zero
  let totalHours = 0;

  // iterate over each CrewMember in data array
  data.forEach(member => {
    // if days empty for member - skip
    if (!member.days) return;
    
    // iterates over each day for crew member
    member.days.forEach(day => {
      // skip if on or off time is missing
      if (!day.on || !day.off) return;
      
      // converts on and off time to minutes
      const onTime = convertToMinutes(day.on);
      const offTime = convertToMinutes(day.off);

      // skips if conversion fails
      if (onTime === null || offTime === null) return;

      // convert total minutes to total hours
      let hours = (offTime - onTime) / 60;
      
      // Handle overnight shifts
      if (hours < 0) {
        hours += 24;
      }

      // calculate running total
      totalHours += hours;
    });
  });
  // round total hours to two decimals
  return Number(totalHours.toFixed(2));
}

// Function to convert to minutes
function convertToMinutes(time: string): number | null {
  // Handle military time format (HHMM) by checking for exactly 4 digits in string
  if (/^\d{4}$/.test(time)) {
    // establishes hours from first 2 digist, minutes from last 2
    const hours = parseInt(time.substring(0, 2));
    const minutes = parseInt(time.substring(2, 4));
    
    // convert to minutes function
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }
  
  // Handle HH:MM format
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    
    //valudate and return total minutes
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }

  return null;
} 