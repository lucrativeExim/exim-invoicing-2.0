'use client';

import { useState, useEffect, useRef } from 'react';

// Format date to dd-mm-yyyy
const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Return as-is if invalid
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// Parse dd-mm-yyyy to YYYY-MM-DD for HTML5 date input
const parseDDMMYYYYToDate = (dateString) => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return '';
  
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2];
  
  // Validate year is 4 digits
  if (year.length !== 4) return '';
  
  // Validate month (01-12)
  const monthNum = parseInt(month, 10);
  if (monthNum < 1 || monthNum > 12) return '';
  
  // Validate day (01-31)
  const dayNum = parseInt(day, 10);
  if (dayNum < 1 || dayNum > 31) return '';
  
  return `${year}-${month}-${day}`;
};

// Validate date parts
const validateDateParts = (day, month, year) => {
  // Year must be exactly 4 digits
  if (year.length !== 4) return false;
  
  // Month must be 01-12
  const monthNum = parseInt(month, 10);
  if (monthNum < 1 || monthNum > 12) return false;
  
  // Day must be 01-31
  const dayNum = parseInt(day, 10);
  if (dayNum < 1 || dayNum > 31) return false;
  
  return true;
};

const DateInput = ({ 
  label, 
  name, 
  value, 
  onChange, 
  error, 
  placeholder, 
  className = '',
  required = false,
  ...props 
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [datePickerValue, setDatePickerValue] = useState('');
  const dateInputRef = useRef(null);

  useEffect(() => {
    if (value) {
      // If value is in YYYY-MM-DD format, convert to dd-mm-yyyy for display
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        setDisplayValue(formatDateToDDMMYYYY(value));
        setDatePickerValue(value); // Keep YYYY-MM-DD for date picker
      } else {
        // Try to parse as dd-mm-yyyy or dd/mm/yyyy (backward compatibility)
        const parts = value.split('-').length === 3 ? value.split('-') : value.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          // If year is 2 digits, try to convert to 4 digits
          if (year.length === 2) {
            const yearNum = parseInt(year, 10);
            const fullYear = yearNum < 50 ? `20${year}` : `19${year}`;
            const formatted = `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${fullYear}`;
            setDisplayValue(formatted);
            const parsed = parseDDMMYYYYToDate(formatted);
            if (parsed) {
              setDatePickerValue(parsed);
            }
          } else if (year.length === 4) {
            const formatted = `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
            setDisplayValue(formatted);
            const parsed = parseDDMMYYYYToDate(formatted);
            if (parsed) {
              setDatePickerValue(parsed);
            }
          } else {
            setDisplayValue(value);
          }
        } else {
          setDisplayValue(value);
        }
      }
    } else {
      setDisplayValue('');
      setDatePickerValue('');
    }
  }, [value]);

  const handleDatePickerChange = (e) => {
    const dateValue = e.target.value; // YYYY-MM-DD format
    setDatePickerValue(dateValue);
    
    if (dateValue) {
      // Convert to dd-mm-yyyy for display
      const formatted = formatDateToDDMMYYYY(dateValue);
      setDisplayValue(formatted);
      
      // Update parent form with YYYY-MM-DD format
      const syntheticEvent = {
        target: {
          name: name,
          value: dateValue
        }
      };
      onChange(syntheticEvent);
    } else {
      setDisplayValue('');
      const syntheticEvent = {
        target: {
          name: name,
          value: ''
        }
      };
      onChange(syntheticEvent);
    }
  };

  const handleTextChange = (e) => {
    let inputValue = e.target.value;
    
    // Remove non-digit and non-slash characters
    inputValue = inputValue.replace(/[^\d/]/g, '');
    
    // Limit to 10 characters (dd-mm-yyyy)
    if (inputValue.length > 10) {
      inputValue = inputValue.slice(0, 10);
    }
    
    // Auto-format as user types: enforce dd-mm-yyyy format
    let formatted = inputValue;
    
    // Remove existing slashes to rebuild format
    const digits = inputValue.replace(/\//g, '');
    
    if (digits.length === 0) {
      formatted = '';
    } else if (digits.length <= 2) {
      // Just day - validate day <= 31
      const day = parseInt(digits, 10);
      if (digits.length === 2 && day > 31) {
        formatted = '31';
      } else {
        formatted = digits;
      }
    } else if (digits.length <= 4) {
      // Day and month - validate month <= 12
      const day = digits.slice(0, 2);
      const month = digits.slice(2);
      const monthNum = parseInt(month, 10);
      
      // Validate day
      const dayNum = parseInt(day, 10);
      let validDay = day;
      if (day.length === 2 && dayNum > 31) {
        validDay = '31';
      }
      
      // Validate month
      let validMonth = month;
      if (month.length === 2 && monthNum > 12) {
        validMonth = '12';
      }
      
      formatted = validDay + '-' + validMonth;
    } else if (digits.length <= 8) {
      // Day, month, and partial year - limit year to 4 digits
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8); // Limit to 4 digits
      
      // Validate day
      const dayNum = parseInt(day, 10);
      let validDay = day;
      if (day.length === 2 && dayNum > 31) {
        validDay = '31';
      }
      
      // Validate month
      const monthNum = parseInt(month, 10);
      let validMonth = month;
      if (month.length === 2 && monthNum > 12) {
        validMonth = '12';
      }
      
      formatted = validDay + '-' + validMonth + '-' + year;
    } else {
      // Full date - limit year to exactly 4 digits
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8); // Exactly 4 digits
      
      // Validate day
      const dayNum = parseInt(day, 10);
      let validDay = day;
      if (dayNum > 31) {
        validDay = '31';
      }
      
      // Validate month
      const monthNum = parseInt(month, 10);
      let validMonth = month;
      if (monthNum > 12) {
        validMonth = '12';
      }
      
      formatted = validDay + '-' + validMonth + '-' + year;
    }
    
    setDisplayValue(formatted);
    
    // Validate and convert to YYYY-MM-DD format for storage
    if (formatted.length === 10 && formatted.split('-').length === 3) {
      const parts = formatted.split('-');
      const [day, month, year] = parts;
      
      // Validate date parts
      if (validateDateParts(day, month, year)) {
        const dateValue = parseDDMMYYYYToDate(formatted);
        if (dateValue) {
          setDatePickerValue(dateValue);
          const syntheticEvent = {
            target: {
              name: name,
              value: dateValue
            }
          };
          onChange(syntheticEvent);
        }
      }
    } else if (formatted.length === 0) {
      setDatePickerValue('');
      const syntheticEvent = {
        target: {
          name: name,
          value: ''
        }
      };
      onChange(syntheticEvent);
    }
  };

  const handleTextBlur = () => {
    // Validate and format on blur
    if (displayValue) {
      const parts = displayValue.split('-').length === 3 ? displayValue.split('-') : displayValue.split('/');
      if (parts.length === 3) {
        let [day, month, year] = parts;
        
        // Pad day and month to 2 digits
        day = day.padStart(2, '0');
        month = month.padStart(2, '0');
        
        // Ensure year is 4 digits
        if (year.length === 2) {
          const yearNum = parseInt(year, 10);
          year = yearNum < 50 ? `20${year}` : `19${year}`;
        } else if (year.length < 4) {
          // If year is less than 4 digits, pad with zeros or current century
          while (year.length < 4) {
            year = '0' + year;
          }
        } else if (year.length > 4) {
          // If year is more than 4 digits, truncate to 4
          year = year.slice(0, 4);
        }
        
        // Validate month
        const monthNum = parseInt(month, 10);
        if (monthNum < 1 || monthNum > 12) {
          // Reset to valid month
          month = monthNum > 12 ? '12' : '01';
        }
        
        // Validate day
        const dayNum = parseInt(day, 10);
        if (dayNum < 1 || dayNum > 31) {
          // Reset to valid day
          day = dayNum > 31 ? '31' : '01';
        }
        
        const formatted = `${day}-${month}-${year}`;
        
        if (validateDateParts(day, month, year)) {
          setDisplayValue(formatted);
          const dateValue = parseDDMMYYYYToDate(formatted);
          if (dateValue) {
            setDatePickerValue(dateValue);
            const syntheticEvent = {
              target: {
                name: name,
                value: dateValue
              }
            };
            onChange(syntheticEvent);
          }
        } else {
          setDisplayValue(formatted);
        }
      }
    }
  };

  const handleCalendarClick = () => {
    // Trigger the hidden date picker when calendar icon is clicked
    if (dateInputRef.current) {
      dateInputRef.current.showPicker();
    }
  };

  return (
    <div className={`mb-2 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {/* Hidden date picker input */}
        <input
          ref={dateInputRef}
          type="date"
          value={datePickerValue}
          onChange={handleDatePickerChange}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          tabIndex={-1}
        />
        
        {/* Visible text input for dd-mm-yyyy display */}
        <input
          type="text"
          id={name}
          name={name}
          value={displayValue}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder={placeholder || 'dd-mm-yyyy'}
          maxLength={10}
          required={required}
          className={`input-field pr-8 ${error ? 'border-red-500 focus:ring-red-500' : ''} ${props.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          {...props}
        />
        
        {/* Calendar icon - clickable to open date picker */}
        <div 
          className="absolute inset-y-0 right-0 flex items-center pr-2 cursor-pointer"
          onClick={handleCalendarClick}
          title="Open date picker"
        >
          <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default DateInput;

