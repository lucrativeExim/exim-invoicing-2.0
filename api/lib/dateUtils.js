/**
 * Date utility functions for Indian Standard Time (IST)
 * IST is UTC+5:30
 */

/**
 * Get current date/time in Indian Standard Time (IST)
 * @returns {Date} Current date/time in IST
 */
function getIndianTime() {
  const now = new Date();
  // IST is UTC+5:30
  // Convert current UTC time to IST
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const utcTime = now.getTime();
  const istTime = new Date(utcTime + istOffset);
  return istTime;
}

/**
 * Get current date/time as a Date object representing IST
 * This function gets the current time in IST (Asia/Kolkata) and returns it as a Date object
 * The Date object will be stored in MySQL and will represent IST time correctly
 * @returns {Date} Current date/time representing IST
 */
function getISTDateTime() {
  // Get current UTC time
  const now = new Date();
  
  // Get IST time components
  const istOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  // Get formatted parts
  const formatter = new Intl.DateTimeFormat('en-US', istOptions);
  const parts = formatter.formatToParts(now);
  
  const getPart = (type) => parseInt(parts.find(p => p.type === type).value);
  const year = getPart('year');
  const month = getPart('month') - 1; // 0-indexed
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');
  
  // Create a Date object with these IST components
  // We create it as UTC, but the values represent IST time
  // So we need to adjust: if we want IST 10:00 AM, we create UTC 10:00 AM
  // then subtract 5.5 hours to get the correct UTC time (04:30 AM UTC = 10:00 AM IST)
  const utcDate = new Date(Date.UTC(year, month, day, hour, minute, second));
  
  // Adjust for IST offset: IST is UTC+5:30
  // So IST time minus 5.5 hours = UTC time
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(utcDate.getTime() - istOffsetMs);
}

/**
 * Format date to IST string (for display/logging)
 * @param {Date} date - Date to format (optional, defaults to current time)
 * @returns {string} Formatted date string in IST
 */
function formatISTDate(date = null) {
  const istDate = date || getIndianTime();
  return istDate.toISOString().replace('T', ' ').substring(0, 19);
}

module.exports = {
  getIndianTime,
  getISTDateTime,
  formatISTDate,
};

